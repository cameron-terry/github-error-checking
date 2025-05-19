import { Octokit } from '@octokit/rest';
/**
 * Repository information
 */
export interface RepoInfo {
    owner: string;
    repo: string;
}
/**
 * Context information for added code
 */
export interface CodeContext {
    linesBefore: string[];
    linesAfter: string[];
}
/**
 * Added code section
 */
export interface AddedCodeSection {
    file: string;
    addedLines: string[];
    isModification?: boolean;
    context: CodeContext;
}
/**
 * Fetches the diff for a pull request
 * @param {Octokit} octokit - Octokit instance
 * @param {RepoInfo} repo - Repository information {owner, repo}
 * @param {number} pullNumber - Pull request number
 * @returns {Promise<string>} PR diff as a string
 */
export declare function getPullRequestDiff(octokit: Octokit, repo: RepoInfo, pullNumber: number): Promise<string>;
/**
 * Parses a diff string to extract added lines of code
 * @param {string} diff - Pull request diff as a string
 * @returns {AddedCodeSection[]} Array of objects with file, added lines, and context
 */
export declare function parseAddedLines(diff: string): AddedCodeSection[];
