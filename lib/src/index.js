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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const diff_utils_1 = require("./diff-utils");
async function run() {
    var _a;
    try {
        let diff;
        // Check if a file path is provided as a command-line argument
        const diffPath = process.argv[2];
        if (diffPath) {
            // Local mode: Read diff from file
            console.log(`Reading diff from file: ${diffPath}`);
            diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
        }
        else {
            // GitHub Actions mode
            console.log('Running in GitHub Actions mode');
            const token = core.getInput('github-token', { required: true });
            const context = github.context;
            if (context.eventName !== 'pull_request') {
                core.info('This action only works on pull requests');
                return;
            }
            const pullNumber = (_a = context.payload.pull_request) === null || _a === void 0 ? void 0 : _a.number;
            if (!pullNumber) {
                core.setFailed('Could not get pull request number from context');
                return;
            }
            const repo = context.repo;
            core.info(`Analyzing pull request #${pullNumber} in ${repo.owner}/${repo.repo}`);
            const octokit = github.getOctokit(token);
            diff = await (0, diff_utils_1.getPullRequestDiff)(octokit, repo, pullNumber);
        }
        // Parse the diff to find added code
        const addedCode = (0, diff_utils_1.parseAddedLines)(diff);
        // Output the results
        console.log(`\nFound ${addedCode.length} sections of added code\n`);
        // Set output if running in GitHub Actions
        if (!diffPath) {
            core.setOutput('added-code', addedCode.length.toString());
        }
        // Display each section
        addedCode.forEach((section, index) => {
            console.log(`Section ${index + 1}:`);
            console.log(`File: ${section.file}`);
            console.log(`Added Lines: ${section.addedLines.length}`);
            if (section.isModification) {
                console.log(`Type: Modification to existing code`);
            }
            else {
                console.log(`Type: New code block`);
            }
            console.log('Context Before:');
            if (section.context.linesBefore.length === 0) {
                console.log('  (none)');
            }
            else {
                section.context.linesBefore.forEach(line => console.log(`  ${line}`));
            }
            console.log('Added Code:');
            section.addedLines.forEach(line => console.log(`+ ${line}`));
            console.log('Context After:');
            if (section.context.linesAfter.length === 0) {
                console.log('  (none)');
            }
            else {
                section.context.linesAfter.forEach(line => console.log(`  ${line}`));
            }
            console.log('\n');
        });
        console.log('Next step: Analyze with LLM and provide suggestions for error handling');
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