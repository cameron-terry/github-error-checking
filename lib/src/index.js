"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const diff_utils_1 = require("./diff-utils");
async function run() {
    var _a;
    try {
        const fs = require('fs');
        const path = require('path');
        // If GitHub event path was provided as argument, it's a GitHub Action
        const eventPath = process.argv[2];
        // Debug logging
        console.log(`Arguments: ${process.argv.join(', ')}`);
        console.log(`Event path: ${eventPath}`);
        console.log(`GITHUB_ACTIONS env: ${process.env.GITHUB_ACTIONS}`);
        console.log(`IS_GITHUB_ACTION env: ${process.env.IS_GITHUB_ACTION}`);
        // Check if we're running in a valid GitHub Actions environment
        // If an event file is passed and it exists, we're definitely in GitHub Actions
        const fileExists = eventPath && fs.existsSync(eventPath);
        const isGitHubAction = fileExists ||
            process.env.IS_GITHUB_ACTION === 'true' ||
            process.env.GITHUB_ACTIONS === 'true';
        console.log(`Event file exists: ${fileExists}`);
        console.log(`Running in GitHub Actions mode: ${isGitHubAction}`);
        // If we have an event file, try to parse it
        if (fileExists) {
            console.log(`Reading event from ${eventPath}`);
            try {
                const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
                console.log(`Event type: ${eventData.action || 'unknown'}`);
                if (eventData.pull_request) {
                    console.log(`PR number: ${eventData.pull_request.number}`);
                }
            }
            catch (e) {
                console.error(`Error parsing event file: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        // If running in local diff mode, process the file
        if (!isGitHubAction) {
            const diffPath = process.argv[2];
            if (!diffPath) {
                console.error('Please provide a path to a diff file');
                console.error('Usage: node index.js <diff-file>');
                process.exit(1);
            }
            const diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
            const addedCode = (0, diff_utils_1.parseAddedLines)(diff);
            console.log(`Found ${addedCode.length} sections of added code`);
            return;
        }
        // GitHub Actions mode - get inputs from the action
        const token = core.getInput('github-token', { required: true });
        const errorTypes = core.getInput('error-types').split(',');
        const context = github.context;
        const octokit = github.getOctokit(token);
        // Check if this is a pull request
        if (context.eventName !== 'pull_request') {
            core.info('This action only works on pull requests.');
            return;
        }
        const pullNumber = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number;
        if (!pullNumber) {
            core.setFailed('Could not get pull request number from context');
            return;
        }
        const repo = context.repo;
        core.info(`Analyzing pull request #${pullNumber} in ${repo.owner}/${repo.repo}`);
        let diff;
        // Check if we're using a mock event with embedded diff (for testing)
        if (context.payload.pull_request && 'diff' in context.payload.pull_request) {
            console.log('Using embedded diff from mock event');
            diff = context.payload.pull_request.diff;
            console.log(`Mock diff length: ${diff.length} characters`);
            console.log(`Mock diff preview: ${diff.substring(0, 200)}...`);
        }
        else {
            // Get PR diff normally through the GitHub API
            console.log('Fetching diff from GitHub API');
            diff = await (0, diff_utils_1.getPullRequestDiff)(octokit, repo, pullNumber);
        }
        // Log diff for debugging
        console.log(`Processing diff (${diff.length} characters)`);
        // Parse diff to get added lines with file context
        const addedCode = (0, diff_utils_1.parseAddedLines)(diff);
        // Output the added code sections for further analysis
        core.setOutput('added-code', JSON.stringify(addedCode));
        // Log what we found
        console.log(`Raw sections found: ${addedCode.length}`);
        if (addedCode.length > 0) {
            addedCode.forEach((section, idx) => {
                console.log(`Section ${idx + 1}: ${section.file} - ${section.addedLines.length} lines added`);
            });
        }
        // This will be replaced by LLM analysis in step 2
        core.info(`Found ${addedCode.length} sections of added code`);
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Action failed with error: ${error.message}`);
        }
        else {
            core.setFailed(`Action failed with unknown error`);
        }
    }
}
run();
//# sourceMappingURL=index.js.map