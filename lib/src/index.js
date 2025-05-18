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
        // Get inputs
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
        // Get PR diff
        const diff = await (0, diff_utils_1.getPullRequestDiff)(octokit, repo, pullNumber);
        // Parse diff to get added lines with file context
        const addedCode = (0, diff_utils_1.parseAddedLines)(diff);
        // Output the added code sections for further analysis
        core.setOutput('added-code', JSON.stringify(addedCode));
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