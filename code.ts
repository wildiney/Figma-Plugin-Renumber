const DEBUG = true;

let instanceName = "";
let textFieldName = "";
let startIndex: number = 1;

figma.showUI(__html__, { themeColors: true, width: 250, height: 400 });

(async () => {
  const savedData = await figma.clientStorage.getAsync("renumberData");
  if (DEBUG) console.log("Initial saved data:", savedData);
  figma.ui.postMessage({ type: "loadedData", data: savedData || {} });

  if (savedData) {
    instanceName = savedData.instanceName || "";
    textFieldName = savedData.textFieldName || "";
    startIndex = Number(savedData.startIndex) || 0;
  }
})();

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "error":
      figma.notify(msg.value);
      break;

    case "setInstanceName":
      instanceName = msg.value;
      if (DEBUG) console.log("Instance name set to:", instanceName);
      break;

    case "setTextFieldName":
      textFieldName = msg.value;
      if (DEBUG) console.log("Text field name set to:", textFieldName);
      break;

    case "setStartIndex":
      startIndex = Number(msg.value) || 0;
      if (DEBUG) console.log("Start index set to:", startIndex);
      break;

    case "saveData":
      await figma.clientStorage.setAsync("renumberData", msg.data);
      if (DEBUG) console.log("Data saved:", msg.data);
      break;

    case "loadData": {
      const savedData = await figma.clientStorage.getAsync("renumberData");
      if (DEBUG) console.log("Saved data requested via loadData:", savedData);
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
      const allInstances = section.findAll(
        (node) => node.type === "INSTANCE"
      ) as InstanceNode[];

      const matchingInstances: InstanceNode[] = [];

      for (const instance of allInstances) {
        const mainComponent = await instance.getMainComponentAsync();
        if (mainComponent?.parent?.type === "COMPONENT_SET") {
          const componentSet = mainComponent.parent;
          if (componentSet.name === instanceName) {
            matchingInstances.push(instance);
          }
        } else if (mainComponent && mainComponent.name === instanceName) {
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

      const filteredInstances: InstanceNode[] = [];

      for (const node of selection) {
        if (node.type === "INSTANCE") {
          const mainComponent = await node.getMainComponentAsync();
          const componentSet = mainComponent?.parent;

          if (componentSet?.name === instanceName) {
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
        const aIndex = a.parent?.children.indexOf(a) ?? -1;
        const bIndex = b.parent?.children.indexOf(b) ?? -1;
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
            await figma.loadFontAsync({ family: "Roboto Slab", style: "Regular" });
          } else {
            await figma.loadFontAsync(font);
          }

          const newNumber = startIndex + i;
          textNode.characters = `${newNumber}`;
          if (DEBUG) console.log(`Set text of instance ${i} to "${newNumber}"`);
        }
      }

      figma.notify("Instances renumbered successfully.");
      break;
    }

    default:
      console.log("Unknown message received:", msg);
  }
};
