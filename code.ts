const DEBUG = false
let INSTANCE_NAME = "Teste"
let TEXT_FIELD = "Teste"
figma.showUI(__html__, { width: 250, height: 250 });


figma.ui.onmessage = async (msg) => {
  if (msg.type === "error") {
    const error = msg.value
    figma.notify(error)
  }
  if (msg.type === "instanceName") {
    INSTANCE_NAME = msg.value
    console.log(msg.value)
  }
  if (msg.type === "textField") {
    TEXT_FIELD = msg.value
    console.log(msg.value)
  }

  if (msg.type === "renumber") {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify(`Select one or more instances of ${INSTANCE_NAME}`);
      return;
    }

    const instances: InstanceNode[] = [];

    for (const node of selection) {
      if (node.type === "INSTANCE") {
        const mainComponent = await node.getMainComponentAsync();
        if (mainComponent) {
          const componentSet = mainComponent.parent
          if (DEBUG) console.log(componentSet?.name)
          if (componentSet?.name === INSTANCE_NAME) {
            instances.push(node);
          }
        }
      }
    }

    if (instances.length === 0) {
      figma.notify(`No instance of ${INSTANCE_NAME} found.`);
      return;
    }

    const ordered = instances.sort((a, b) => {
      const aIndex = a.parent?.children.indexOf(a) ?? -1;
      const bIndex = b.parent?.children.indexOf(b) ?? -1;
      return aIndex - bIndex;
    });

    for (let idx = 0; idx < ordered.length; idx++) {
      const instance = ordered[idx];

      const textNode = instance.findOne(n => {
        if (DEBUG) console.log(n.name)
        return n.type === "TEXT" && n.name === TEXT_FIELD
      }
      );

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
