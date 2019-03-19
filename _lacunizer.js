/** 
 * @author
 * Kishan Nirghin
 * 
 * @description
 * This file retrieves the functions of the project
 * Creates a graph with nodes representing these functions
 * Executes the different analyzers of Lacuna on the projects
 * Creates the edges in the graph
 * 
 * Outputs information regarding the functions
 */

const path = require("path");
const logger = require("./_logger");

const JsEditor = require("./js_editor"),
    HTMLEditor = require("./html_editor"),
    CallGraph = require("./call_graph");

const lacunaSettings = require("./_settings");

/**
 * Retrieve all scripts and functions of the given project
 * Creates an empty call-graph given the prior
 * Fetches the analyser objects
 * Runs the analysers to complete the call-graph (create edges)
 */
function run(runOptions, callback) {
    var scripts = retrieveScripts(path.join(runOptions.directory, runOptions.entry));
    var functions = retrieveFunctions(scripts);
    
    var callGraph = new CallGraph(functions);
    var analyzers = retrieveAnalyzers(runOptions.analyzer);
    
    var analyzerResults = [];
    var analyzersCompleted = {};
    analyzers.forEach((analyzer) => {
        analyzersCompleted[analyzer.name] = false;

        try {
            analyzer.object.run(runOptions, callGraph, scripts, (edges) => {                
                analyzerResults.push({
                    analyzer: analyzer.name,
                    edges: edges
                });

                analyzerCompleted(analyzer);
            });
        } catch (error) {
            logger.warn(`Analyzer[${analyzer.name}] failed`);

            console.log("Catch analyzer");
            console.log(error);
            
            analyzerCompleted(analyzer);
        } finally { // check if we're finished
            
        }    
    });

    /** marks an analyzer as completed, and checks if we're done */
    function analyzerCompleted(analyzer) {
        logger.verbose(`Analyzer[${analyzer.name}] finished`);
        analyzersCompleted[analyzer.name] = true;

        if (Object.keys(analyzersCompleted).length != analyzers.length) { return; }
        for (const [key, value] of Object.entries(analyzersCompleted)) {
            if (!value) { return; }
        }
        logger.verbose(`CallGraph creation completed`);
        callback(callGraph, analyzerResults);
    }
}



/**
 * Retrieves the functions from javascript
 */
function retrieveFunctions(scripts) {
    var functions = [];

    scripts.forEach((script) => {
        var jse = new JsEditor();
        jse.loadSource(script.source, script.src);
        var functionsOfFile = jse.loadFunctionData();
        functions = functions.concat(functionsOfFile);
    });

    return functions;
}

/**
 * Retrieves both the internal as external scripts from an HTML file
 *
 * @param entryFile the HTML file location
 */
function retrieveScripts(entryFile) {
    var htmle = new HTMLEditor().loadFile(entryFile);
    var scripts = [];

    var externalScripts = htmle.getExternalScripts();
    externalScripts.forEach((extScript) => {
        scripts.push({
            src: extScript.src,
            source: extScript.source,
            type: "external"
        });
    });

    var internalScripts = htmle.getInternalScripts();
    internalScripts.forEach((intScript) => {
        scripts.push({
            src: intScript.src,
            source: intScript.source,
            type: "internal"
        });
    });

    return scripts;
}

/**
 * Retrieves the analyzer classes
 * @param {*} analyzerNames 
 */
function retrieveAnalyzers(analyzerNames) {
    var analyzers = [];

    analyzerNames.forEach((analyzerName) => {
        var analyzerRequirePath = "./" + path.join(lacunaSettings.ANALYZERS_DIR, analyzerName);
        var Analyzer = require(analyzerRequirePath);
        analyzers.push({ name: analyzerName, object: new Analyzer() });
    });

    return analyzers;
}



module.exports = {
    run
}