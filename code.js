"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const DEBUG = true;
let instanceName = "";
let textFieldName = "";
let startIndex = 1;
figma.showUI(__html__, { themeColors: true, width: 250, height: 400 });
(() => __awaiter(void 0, void 0, void 0, function* () {
    const savedData = yield figma.clientStorage.getAsync("renumberData");
    if (DEBUG)
        console.log("Initial saved data:", savedData);
    figma.ui.postMessage({ type: "loadedData", data: savedData || {} });
    if (savedData) {
        instanceName = savedData.instanceName || "";
        textFieldName = savedData.textFieldName || "";
        startIndex = Number(savedData.startIndex) || 0;
    }
}))();
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    switch (msg.type) {
        case "error":
            figma.notify(msg.value);
            break;
        case "setInstanceName":
            instanceName = msg.value;
            if (DEBUG)
                console.log("Instance name set to:", instanceName);
            break;
        case "setTextFieldName":
            textFieldName = msg.value;
            if (DEBUG)
                console.log("Text field name set to:", textFieldName);
            break;
        case "setStartIndex":
            startIndex = Number(msg.value) || 0;
            if (DEBUG)
                console.log("Start index set to:", startIndex);
            break;
        case "saveData":
            yield figma.clientStorage.setAsync("renumberData", msg.data);
            if (DEBUG)
                console.log("Data saved:", msg.data);
            break;
        case "loadData": {
            const savedData = yield figma.clientStorage.getAsync("renumberData");
            if (DEBUG)
                console.log("Saved data requested via loadData:", savedData);
            figma.ui.postMessage({ type: "loadedData", data: savedData || {} });
            break;
        }
        case "selectInstances": {
            const selection = figma.currentPage.selection;
            if (selection.length !== 1 || selection[0].type !== "SECTION") {
                figma.notify("Select exactly one Section.");
                return;
            }
            const section = selection[0];
            const allInstances = section.findAll((node) => node.type === "INSTANCE");
            const matchingInstances = [];
            for (const instance of allInstances) {
                const mainComponent = yield instance.getMainComponentAsync();
                if (((_a = mainComponent === null || mainComponent === void 0 ? void 0 : mainComponent.parent) === null || _a === void 0 ? void 0 : _a.type) === "COMPONENT_SET") {
                    const componentSet = mainComponent.parent;
                    if (componentSet.name === instanceName) {
                        matchingInstances.push(instance);
                    }
                }
                else if (mainComponent && mainComponent.name === instanceName) {
                    matchingInstances.push(instance);
                }
            }
            if (matchingInstances.length === 0) {
                figma.notify(`No matching instances of "${instanceName}" found in the section.`);
                return;
            }
            figma.currentPage.selection = matchingInstances;
            figma.viewport.scrollAndZoomIntoView(matchingInstances);
            figma.notify(`${matchingInstances.length} instance(s) selected`);
            break;
        }
        case "renumberInstances": {
            if (!instanceName.trim() || !textFieldName.trim()) {
                figma.notify("Instance name and Text field name must be set.");
                return;
            }
            const selection = figma.currentPage.selection;
            if (selection.length === 0) {
                figma.notify(`Select one or more instances of "${instanceName}".`);
                return;
            }
            const filteredInstances = [];
            for (const node of selection) {
                if (node.type === "INSTANCE") {
                    const mainComponent = yield node.getMainComponentAsync();
                    const componentSet = mainComponent === null || mainComponent === void 0 ? void 0 : mainComponent.parent;
                    if ((componentSet === null || componentSet === void 0 ? void 0 : componentSet.name) === instanceName) {
                        filteredInstances.push(node);
                    }
                }
            }
            if (filteredInstances.length === 0) {
                figma.notify(`No instance of "${instanceName}" found in selection.`);
                return;
            }
            // Sort instances by their position in the parent’s children array
            const orderedInstances = filteredInstances.sort((a, b) => {
                var _a, _b, _c, _d;
                const aIndex = (_b = (_a = a.parent) === null || _a === void 0 ? void 0 : _a.children.indexOf(a)) !== null && _b !== void 0 ? _b : -1;
                const bIndex = (_d = (_c = b.parent) === null || _c === void 0 ? void 0 : _c.children.indexOf(b)) !== null && _d !== void 0 ? _d : -1;
                return aIndex - bIndex;
            });
            for (let i = 0; i < orderedInstances.length; i++) {
                const instance = orderedInstances[i];
                const textNode = instance.findOne((node) => {
                    return node.type === "TEXT" && node.name === textFieldName;
                });
                if (textNode && textNode.type === "TEXT") {
                    const font = textNode.fontName;
                    if (font === figma.mixed) {
                        yield figma.loadFontAsync({ family: "Roboto Slab", style: "Regular" });
                    }
                    else {
                        yield figma.loadFontAsync(font);
                    }
                    const newNumber = startIndex + i;
                    textNode.characters = `${newNumber}`;
                    if (DEBUG)
                        console.log(`Set text of instance ${i} to "${newNumber}"`);
                }
            }
            figma.notify("Instances renumbered successfully.");
            break;
        }
        default:
            console.log("Unknown message received:", msg);
    }
});
