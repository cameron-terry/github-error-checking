/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 822:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Local test runner for the GitHub Action
 * This allows testing the action without having to create a PR
 */
const fs = __importStar(__nccwpck_require__(147));
const path = __importStar(__nccwpck_require__(17));
const diff_utils_1 = __nccwpck_require__(183);
async function main() {
    // Check if a diff file was provided
    const diffPath = process.argv[2];
    if (!diffPath) {
        console.error('Please provide a path to a diff file');
        console.error('Usage: node index.js <diff-file>');
        process.exit(1);
    }
    try {
        // Read the diff file
        const diff = fs.readFileSync(path.resolve(diffPath), 'utf8');
        // Parse the diff to get added lines
        const addedCode = (0, diff_utils_1.parseAddedLines)(diff);
        console.log(`Found ${addedCode.length} sections of added code\n`);
        // Print each section
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
                section.context.linesBefore.forEach(line => {
                    // Check if this is a deleted line (from modifications)
                    if (line.startsWith('- ')) {
                        console.log(`\x1b[31m- ${line.substring(2)}\x1b[0m`); // Red for deleted lines
                    }
                    else {
                        console.log(`  ${line}`);
                    }
                });
            }
            console.log('Added Code:');
            section.addedLines.forEach(line => console.log(`\x1b[32m+ ${line}\x1b[0m`)); // Green for added lines
            console.log('Context After:');
            if (section.context.linesAfter.length === 0) {
                console.log('  (none)');
            }
            else {
                section.context.linesAfter.forEach(line => console.log(`  ${line}`));
            }
            console.log('\n');
        });
        // Next step would be to analyze the added code with an LLM
        console.log('Next step: Analyze with LLM and provide suggestions for error handling');
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        }
        else {
            console.error('Unknown error occurred');
        }
        process.exit(1);
    }
}
// Run the script
main();
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 183:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getPullRequestDiff = getPullRequestDiff;
exports.parseAddedLines = parseAddedLines;
/**
 * Utilities for processing GitHub pull request diffs
 */
const parse_diff_1 = __importDefault(__nccwpck_require__(833));
/**
 * Fetches the diff for a pull request
 * @param {Octokit} octokit - Octokit instance
 * @param {RepoInfo} repo - Repository information {owner, repo}
 * @param {number} pullNumber - Pull request number
 * @returns {Promise<string>} PR diff as a string
 */
async function getPullRequestDiff(octokit, repo, pullNumber) {
    const response = await octokit.pulls.get({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: pullNumber,
        mediaType: {
            format: 'diff'
        }
    });
    // When requesting a diff, the response data is a string
    return response.data;
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

/***/ }),

/***/ 833:
/***/ ((module) => {

function _typeof(obj){"@babel/helpers - typeof";return _typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(obj){return typeof obj}:function(obj){return obj&&"function"==typeof Symbol&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj},_typeof(obj)}function _createForOfIteratorHelper(o,allowArrayLike){var it=typeof Symbol!=="undefined"&&o[Symbol.iterator]||o["@@iterator"];if(!it){if(Array.isArray(o)||(it=_unsupportedIterableToArray(o))||allowArrayLike&&o&&typeof o.length==="number"){if(it)o=it;var i=0;var F=function F(){};return{s:F,n:function n(){if(i>=o.length)return{done:true};return{done:false,value:o[i++]}},e:function e(_e2){throw _e2},f:F}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var normalCompletion=true,didErr=false,err;return{s:function s(){it=it.call(o)},n:function n(){var step=it.next();normalCompletion=step.done;return step},e:function e(_e3){didErr=true;err=_e3},f:function f(){try{if(!normalCompletion&&it["return"]!=null)it["return"]()}finally{if(didErr)throw err}}}}function _defineProperty(obj,key,value){key=_toPropertyKey(key);if(key in obj){Object.defineProperty(obj,key,{value:value,enumerable:true,configurable:true,writable:true})}else{obj[key]=value}return obj}function _toPropertyKey(arg){var key=_toPrimitive(arg,"string");return _typeof(key)==="symbol"?key:String(key)}function _toPrimitive(input,hint){if(_typeof(input)!=="object"||input===null)return input;var prim=input[Symbol.toPrimitive];if(prim!==undefined){var res=prim.call(input,hint||"default");if(_typeof(res)!=="object")return res;throw new TypeError("@@toPrimitive must return a primitive value.")}return(hint==="string"?String:Number)(input)}function _slicedToArray(arr,i){return _arrayWithHoles(arr)||_iterableToArrayLimit(arr,i)||_unsupportedIterableToArray(arr,i)||_nonIterableRest()}function _nonIterableRest(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}function _unsupportedIterableToArray(o,minLen){if(!o)return;if(typeof o==="string")return _arrayLikeToArray(o,minLen);var n=Object.prototype.toString.call(o).slice(8,-1);if(n==="Object"&&o.constructor)n=o.constructor.name;if(n==="Map"||n==="Set")return Array.from(o);if(n==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))return _arrayLikeToArray(o,minLen)}function _arrayLikeToArray(arr,len){if(len==null||len>arr.length)len=arr.length;for(var i=0,arr2=new Array(len);i<len;i++){arr2[i]=arr[i]}return arr2}function _iterableToArrayLimit(arr,i){var _i=null==arr?null:"undefined"!=typeof Symbol&&arr[Symbol.iterator]||arr["@@iterator"];if(null!=_i){var _s,_e,_x,_r,_arr=[],_n=!0,_d=!1;try{if(_x=(_i=_i.call(arr)).next,0===i){if(Object(_i)!==_i)return;_n=!1}else for(;!(_n=(_s=_x.call(_i)).done)&&(_arr.push(_s.value),_arr.length!==i);_n=!0){;}}catch(err){_d=!0,_e=err}finally{try{if(!_n&&null!=_i["return"]&&(_r=_i["return"](),Object(_r)!==_r))return}finally{if(_d)throw _e}}return _arr}}function _arrayWithHoles(arr){if(Array.isArray(arr))return arr}module.exports=function(input){if(!input)return[];if(typeof input!=="string"||input.match(/^\s+$/))return[];var lines=input.split("\n");if(lines.length===0)return[];var files=[];var currentFile=null;var currentChunk=null;var deletedLineCounter=0;var addedLineCounter=0;var currentFileChanges=null;var normal=function normal(line){var _currentChunk;(_currentChunk=currentChunk)===null||_currentChunk===void 0?void 0:_currentChunk.changes.push({type:"normal",normal:true,ln1:deletedLineCounter++,ln2:addedLineCounter++,content:line});currentFileChanges.oldLines--;currentFileChanges.newLines--};var start=function start(line){var _parseFiles;var _ref=(_parseFiles=parseFiles(line))!==null&&_parseFiles!==void 0?_parseFiles:[],_ref2=_slicedToArray(_ref,2),fromFileName=_ref2[0],toFileName=_ref2[1];currentFile={chunks:[],deletions:0,additions:0,from:fromFileName,to:toFileName};files.push(currentFile)};var restart=function restart(){if(!currentFile||currentFile.chunks.length)start()};var newFile=function newFile(_,match){restart();currentFile["new"]=true;currentFile.newMode=match[1];currentFile.from="/dev/null"};var deletedFile=function deletedFile(_,match){restart();currentFile.deleted=true;currentFile.oldMode=match[1];currentFile.to="/dev/null"};var oldMode=function oldMode(_,match){restart();currentFile.oldMode=match[1]};var newMode=function newMode(_,match){restart();currentFile.newMode=match[1]};var index=function index(line,match){restart();currentFile.index=line.split(" ").slice(1);if(match[1]){currentFile.oldMode=currentFile.newMode=match[1].trim()}};var fromFile=function fromFile(line){restart();currentFile.from=parseOldOrNewFile(line)};var toFile=function toFile(line){restart();currentFile.to=parseOldOrNewFile(line)};var toNumOfLines=function toNumOfLines(number){return+(number||1)};var chunk=function chunk(line,match){if(!currentFile){start(line)}var _match$slice=match.slice(1),_match$slice2=_slicedToArray(_match$slice,4),oldStart=_match$slice2[0],oldNumLines=_match$slice2[1],newStart=_match$slice2[2],newNumLines=_match$slice2[3];deletedLineCounter=+oldStart;addedLineCounter=+newStart;currentChunk={content:line,changes:[],oldStart:+oldStart,oldLines:toNumOfLines(oldNumLines),newStart:+newStart,newLines:toNumOfLines(newNumLines)};currentFileChanges={oldLines:toNumOfLines(oldNumLines),newLines:toNumOfLines(newNumLines)};currentFile.chunks.push(currentChunk)};var del=function del(line){if(!currentChunk)return;currentChunk.changes.push({type:"del",del:true,ln:deletedLineCounter++,content:line});currentFile.deletions++;currentFileChanges.oldLines--};var add=function add(line){if(!currentChunk)return;currentChunk.changes.push({type:"add",add:true,ln:addedLineCounter++,content:line});currentFile.additions++;currentFileChanges.newLines--};var eof=function eof(line){var _currentChunk$changes3;if(!currentChunk)return;var _currentChunk$changes=currentChunk.changes.slice(-1),_currentChunk$changes2=_slicedToArray(_currentChunk$changes,1),mostRecentChange=_currentChunk$changes2[0];currentChunk.changes.push((_currentChunk$changes3={type:mostRecentChange.type},_defineProperty(_currentChunk$changes3,mostRecentChange.type,true),_defineProperty(_currentChunk$changes3,"ln1",mostRecentChange.ln1),_defineProperty(_currentChunk$changes3,"ln2",mostRecentChange.ln2),_defineProperty(_currentChunk$changes3,"ln",mostRecentChange.ln),_defineProperty(_currentChunk$changes3,"content",line),_currentChunk$changes3))};var schemaHeaders=[[/^diff\s/,start],[/^new file mode (\d+)$/,newFile],[/^deleted file mode (\d+)$/,deletedFile],[/^old mode (\d+)$/,oldMode],[/^new mode (\d+)$/,newMode],[/^index\s[\da-zA-Z]+\.\.[\da-zA-Z]+(\s(\d+))?$/,index],[/^---\s/,fromFile],[/^\+\+\+\s/,toFile],[/^@@\s+-(\d+),?(\d+)?\s+\+(\d+),?(\d+)?\s@@/,chunk],[/^\\ No newline at end of file$/,eof]];var schemaContent=[[/^\\ No newline at end of file$/,eof],[/^-/,del],[/^\+/,add],[/^\s+/,normal]];var parseContentLine=function parseContentLine(line){for(var _i2=0,_schemaContent=schemaContent;_i2<_schemaContent.length;_i2++){var _schemaContent$_i=_slicedToArray(_schemaContent[_i2],2),pattern=_schemaContent$_i[0],handler=_schemaContent$_i[1];var match=line.match(pattern);if(match){handler(line,match);break}}if(currentFileChanges.oldLines===0&&currentFileChanges.newLines===0){currentFileChanges=null}};var parseHeaderLine=function parseHeaderLine(line){for(var _i3=0,_schemaHeaders=schemaHeaders;_i3<_schemaHeaders.length;_i3++){var _schemaHeaders$_i=_slicedToArray(_schemaHeaders[_i3],2),pattern=_schemaHeaders$_i[0],handler=_schemaHeaders$_i[1];var match=line.match(pattern);if(match){handler(line,match);break}}};var parseLine=function parseLine(line){if(currentFileChanges){parseContentLine(line)}else{parseHeaderLine(line)}return};var _iterator=_createForOfIteratorHelper(lines),_step;try{for(_iterator.s();!(_step=_iterator.n()).done;){var line=_step.value;parseLine(line)}}catch(err){_iterator.e(err)}finally{_iterator.f()}return files};var fileNameDiffRegex=/(a|i|w|c|o|1|2)\/.*(?=["']? ["']?(b|i|w|c|o|1|2)\/)|(b|i|w|c|o|1|2)\/.*$/g;var gitFileHeaderRegex=/^(a|b|i|w|c|o|1|2)\//;var parseFiles=function parseFiles(line){var fileNames=line===null||line===void 0?void 0:line.match(fileNameDiffRegex);return fileNames===null||fileNames===void 0?void 0:fileNames.map(function(fileName){return fileName.replace(gitFileHeaderRegex,"").replace(/("|')$/,"")})};var qoutedFileNameRegex=/^\\?['"]|\\?['"]$/g;var parseOldOrNewFile=function parseOldOrNewFile(line){var fileName=leftTrimChars(line,"-+").trim();fileName=removeTimeStamp(fileName);return fileName.replace(qoutedFileNameRegex,"").replace(gitFileHeaderRegex,"")};var leftTrimChars=function leftTrimChars(string,trimmingChars){string=makeString(string);if(!trimmingChars&&String.prototype.trimLeft)return string.trimLeft();var trimmingString=formTrimmingString(trimmingChars);return string.replace(new RegExp("^".concat(trimmingString,"+")),"")};var timeStampRegex=/\t.*|\d{4}-\d\d-\d\d\s\d\d:\d\d:\d\d(.\d+)?\s(\+|-)\d\d\d\d/;var removeTimeStamp=function removeTimeStamp(string){var timeStamp=timeStampRegex.exec(string);if(timeStamp){string=string.substring(0,timeStamp.index).trim()}return string};var formTrimmingString=function formTrimmingString(trimmingChars){if(trimmingChars===null||trimmingChars===undefined)return"\\s";else if(trimmingChars instanceof RegExp)return trimmingChars.source;return"[".concat(makeString(trimmingChars).replace(/([.*+?^=!:${}()|[\]/\\])/g,"\\$1"),"]")};var makeString=function makeString(itemToConvert){return(itemToConvert!==null&&itemToConvert!==void 0?itemToConvert:"")+""};


/***/ }),

/***/ 147:
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ 17:
/***/ ((module) => {

module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __nccwpck_require__(822);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;