"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPullRequestDiff = getPullRequestDiff;
exports.parseAddedLines = parseAddedLines;
/**
 * Utilities for processing GitHub pull request diffs
 */
const parse_diff_1 = __importDefault(require("parse-diff"));
const logger_1 = require("./logger");
/**
 * Fetches the diff for a pull request
 * @param {ActionsOctokit} octokit - Octokit instance
 * @param {RepoInfo} repo - Repository information {owner, repo}
 * @param {number} pullNumber - Pull request number
 * @returns {Promise<string>} PR diff as a string
 */
async function getPullRequestDiff(octokit, repo, pullNumber) {
    try {
        logger_1.logger.debug('Fetching PR diff using octokit.rest.pulls.get API');
        // Use the rest.pulls API that we know works in GitHub Actions
        try {
            const response = await octokit.rest.pulls.get({
                owner: repo.owner,
                repo: repo.repo,
                pull_number: pullNumber,
                mediaType: {
                    format: 'diff'
                }
            });
            logger_1.logger.info('Successfully fetched PR diff');
            return response.data;
        }
        catch (apiErr) {
            logger_1.logger.warning(`API error: ${apiErr instanceof Error ? apiErr.message : 'Unknown error'}`);
            throw new Error(`Failed to fetch PR diff: ${apiErr instanceof Error ? apiErr.message : 'Unknown error'}`);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch PR diff: ${error.message}`);
        }
        else {
            throw new Error('Failed to fetch PR diff: Unknown error');
        }
    }
}
/**
 * Checks if a sequence of changes looks like a modification to existing code
 * rather than a new code block
 * @param {Change[]} changes - A sequence of changes
 * @param {number} startIdx - Start index of the sequence
 * @param {number} endIdx - End index of the sequence
 * @returns {boolean} True if it's likely a modification to existing code
 */
function isModificationToExistingCode(changes, startIdx, endIdx) {
    // If there are del changes near the add changes, it's likely a modification
    const nearbyRange = 3; // How many lines to look before/after
    const rangeStart = Math.max(0, startIdx - nearbyRange);
    const rangeEnd = Math.min(changes.length - 1, endIdx + nearbyRange);
    // Look for del changes near the add changes
    for (let i = rangeStart; i <= rangeEnd; i++) {
        if (changes[i] && changes[i].type === 'del') {
            return true;
        }
    }
    return false;
}
/**
 * Parses a diff string to extract added lines of code
 * @param {string} diff - Pull request diff as a string
 * @returns {AddedCodeSection[]} Array of objects with file, added lines, and context
 */
function parseAddedLines(diff) {
    // Use parse-diff to parse the diff
    const files = (0, parse_diff_1.default)(diff);
    const addedCodeSections = [];
    // Process each file in the diff
    for (const file of files) {
        const fileName = file.to || '';
        // Process each chunk/hunk in the file
        for (const chunk of file.chunks) {
            // Group consecutive added lines into blocks
            let currentBlock = [];
            let blockStartIdx = -1;
            for (let i = 0; i < chunk.changes.length; i++) {
                const change = chunk.changes[i];
                if (change.type === 'add') {
                    if (currentBlock.length === 0) {
                        blockStartIdx = i;
                    }
                    currentBlock.push(change);
                }
                else if (currentBlock.length > 0) {
                    // We've reached the end of a block of added lines
                    const blockEndIdx = i - 1;
                    // Check if this is a new code block or a modification
                    const isModification = isModificationToExistingCode(chunk.changes, blockStartIdx, blockEndIdx);
                    // Only process blocks that are new code, not modifications
                    if (!isModification) {
                        processAddedBlock(addedCodeSections, fileName, chunk.changes, blockStartIdx, blockEndIdx);
                    }
                    else {
                        // This is a modification, treat the whole modification as one section
                        processModification(addedCodeSections, fileName, chunk.changes, blockStartIdx, blockEndIdx);
                    }
                    currentBlock = [];
                    blockStartIdx = -1;
                }
            }
            // Don't forget to process the last block if it ends the chunk
            if (currentBlock.length > 0) {
                const blockEndIdx = chunk.changes.length - 1;
                const isModification = isModificationToExistingCode(chunk.changes, blockStartIdx, blockEndIdx);
                if (!isModification) {
                    processAddedBlock(addedCodeSections, fileName, chunk.changes, blockStartIdx, blockEndIdx);
                }
                else {
                    processModification(addedCodeSections, fileName, chunk.changes, blockStartIdx, blockEndIdx);
                }
            }
        }
    }
    return addedCodeSections;
}
/**
 * Processes a block of purely added lines (new code)
 * @param {AddedCodeSection[]} sections - Collection to add the result to
 * @param {string} fileName - File name
 * @param {Change[]} changes - All changes in the chunk
 * @param {number} startIdx - Start index of the block
 * @param {number} endIdx - End index of the block
 */
function processAddedBlock(sections, fileName, changes, startIdx, endIdx) {
    // Get added lines (without the '+' prefix)
    const addedLines = changes
        .slice(startIdx, endIdx + 1)
        .map(change => change.content.substring(1));
    // Get context before (up to 3 lines)
    const linesBefore = changes
        .slice(Math.max(0, startIdx - 3), startIdx)
        .filter(change => change.type === 'normal')
        .map(change => change.content.substring(1));
    // Get context after (up to 3 lines)
    const linesAfter = changes
        .slice(endIdx + 1, endIdx + 4)
        .filter(change => change.type === 'normal')
        .map(change => change.content.substring(1));
    sections.push({
        file: fileName,
        addedLines,
        context: {
            linesBefore,
            linesAfter
        }
    });
}
/**
 * Processes a section that appears to be a modification to existing code
 * @param {AddedCodeSection[]} sections - Collection to add the result to
 * @param {string} fileName - File name
 * @param {Change[]} changes - All changes in the chunk
 * @param {number} startIdx - Start index of added changes
 * @param {number} endIdx - End index of added changes
 */
function processModification(sections, fileName, changes, startIdx, endIdx) {
    // Find nearby del lines to include in context
    const nearbyRange = 3;
    const rangeStart = Math.max(0, startIdx - nearbyRange);
    // Get context including both normal and del lines
    const beforeContext = [];
    for (let i = rangeStart; i < startIdx; i++) {
        const change = changes[i];
        // Include both normal and del lines as context
        if (change.type === 'normal' || change.type === 'del') {
            // For del lines, prefix with '-' to show they were removed
            const prefix = change.type === 'del' ? '- ' : '';
            beforeContext.push(prefix + change.content.substring(1));
        }
    }
    // Get added lines (without the '+' prefix)
    const addedLines = changes
        .slice(startIdx, endIdx + 1)
        .map(change => change.content.substring(1));
    // Get after context, only normal lines
    const rangeEnd = Math.min(changes.length - 1, endIdx + nearbyRange);
    const afterContext = [];
    for (let i = endIdx + 1; i <= rangeEnd; i++) {
        const change = changes[i];
        if (change.type === 'normal') {
            afterContext.push(change.content.substring(1));
        }
    }
    sections.push({
        file: fileName,
        addedLines,
        isModification: true,
        context: {
            linesBefore: beforeContext,
            linesAfter: afterContext
        }
    });
}
//# sourceMappingURL=diff-utils.js.map