const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = function override(config) {

    // Preserve CRA's original React entry point
    const originalEntry = config.entry;

    // Add a second entry point for the MSAL redirect bridge
    config.entry = {
        main: originalEntry,
        redirect: "./src/redirect.js"
    };

    // Multiple entry points need distinct output filenames
    config.output.filename = "static/js/[name].js";

    // Find CRA's existing HTML plugin
    const htmlPlugin = config.plugins.find(
        plugin =>
            plugin instanceof HtmlWebpackPlugin
    );

    if (htmlPlugin) {

        // The normal React application should only receive main.js
        htmlPlugin.options.chunks = ["main"];

        // Create the dedicated MSAL redirect page
        config.plugins.push(
            new HtmlWebpackPlugin({
                filename: "redirect.html",
                template: "./public/redirect.html",
                chunks: ["redirect"],
                inject: "body"
            })
        );
    }

    return config;
};