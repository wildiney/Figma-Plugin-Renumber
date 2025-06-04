const DEBUG = true;
let INSTANCE_NAME = "";
let TEXT_FIELD = "";

figma.showUI(__html__, { themeColors: true, width: 250, height: 400 });

(async () => {
  const savedData = await figma.clientStorage.getAsync("renumber-data");
  if (DEBUG) console.log("Initial saved data:", savedData);
  figma.ui.postMessage({ type: "loadedData", data: savedData || {} });

  if (savedData) {
    INSTANCE_NAME = savedData.instanceName || "";
    TEXT_FIELD = savedData.textField || "";
  }
})();

figma.ui.onmessage = async (msg) => {
  if (msg.type === "error") {
    figma.notify(msg.value);
  }

  if (msg.type === "instanceName") {
    INSTANCE_NAME = msg.value;
    if (DEBUG) console.log("Instance Name set to:", INSTANCE_NAME);
  }

  if (msg.type === "textField") {
    TEXT_FIELD = msg.value;
    if (DEBUG) console.log("Text Field set to:", TEXT_FIELD);
  }

  if (msg.type === "saveData") {
    await figma.clientStorage.setAsync("renumber-data", msg.data);
    if (DEBUG) console.log("Data saved:", msg.data);
  }

  if (msg.type === "selectInstances") {
    console.log('selection')
    const selection = figma.currentPage.selection

    if (selection.length !== 1 || selection[0].type !== "SECTION") {
      figma.notify("Select exactly one Section.");
      return;
    }

    const section = selection[0]

    const allInstances = section.findAll(node => node.type === "INSTANCE") as InstanceNode[]

    const matchingInstances: InstanceNode[] = []

    for (const instance of allInstances) {
      const mainComponent = await instance.getMainComponentAsync()
      if (mainComponent?.parent?.type === "COMPONENT_SET") {
        const componentSet = mainComponent.parent
        if (componentSet.name === INSTANCE_NAME) {
          matchingInstances.push(instance)
        }
      } else if (mainComponent && mainComponent.name === INSTANCE_NAME) {
        matchingInstances.push(instance)
      }
    }

    if (matchingInstances.length === 0) {
      figma.notify(`No matching instances of ${INSTANCE_NAME} found in the section.`)
      return
    }

    figma.currentPage.selection = matchingInstances
    figma.viewport.scrollAndZoomIntoView(matchingInstances)
    figma.notify(`${matchingInstances.length} instance(s) selected`)

  }

  if (msg.type === "renumber") {
    if (!INSTANCE_NAME || !TEXT_FIELD) {
      figma.notify("Instance name and Text field name must be set.");
      return;
    }

    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify(`Select one or more instances of "${INSTANCE_NAME}"`);
      return;
    }

    const instances: InstanceNode[] = [];

    for (const node of selection) {
      if (node.type === "INSTANCE") {
        const mainComponent = await node.getMainComponentAsync();
        if (mainComponent) {
          const componentSet = mainComponent.parent;
          if (DEBUG) console.log("Component set name:", componentSet?.name);
          if (componentSet?.name === INSTANCE_NAME) {
            instances.push(node);
          }
        }
      }
    }

    if (instances.length === 0) {
      figma.notify(`No instance of "${INSTANCE_NAME}" found.`);
      return;
    }

    const ordered = instances.sort((a, b) => {
      const aIndex = a.parent?.children.indexOf(a) ?? -1;
      const bIndex = b.parent?.children.indexOf(b) ?? -1;
      return aIndex - bIndex;
    });

    for (let idx = 0; idx < ordered.length; idx++) {
      const instance = ordered[idx];

      const textNode = instance.findOne((n) => {
        if (DEBUG) console.log(n.name);
        return n.type === "TEXT" && n.name === TEXT_FIELD;
      });

      if (textNode && textNode.type === "TEXT") {
        const font = textNode.fontName;
        if (font === figma.mixed) {
          await figma.loadFontAsync({ family: "Roboto Slab", style: "Regular" });
        } else {
          await figma.loadFontAsync(font);
        }

        textNode.characters = `${idx + 1}`;
      }
    }

    figma.notify("Instances Renamed");
  }
};
