figma.showUI(__html__, { width: 200, height: 100 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "renumerar") {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.notify("Selecione uma ou mais instâncias do componente Etapa.");
      return;
    }

    // Filtra as instâncias do componente chamado "Etapa"
    const etapas: InstanceNode[] = [];

    for (const node of selection) {
      if (node.type === "INSTANCE") {
        const mainComponent = await node.getMainComponentAsync();
        if (mainComponent?.name === "Etapa") {
          etapas.push(node);
        }
      }
    }

    if (etapas.length === 0) {
      figma.notify("Nenhuma instância válida de 'Etapa' encontrada.");
      return;
    }

    // Ordena pela ordem visual no painel de camadas
    const ordered = etapas.sort((a, b) => {
      const aIndex = a.parent?.children.indexOf(a) ?? -1;
      const bIndex = b.parent?.children.indexOf(b) ?? -1;
      return aIndex - bIndex;
    });

    for (let idx = 0; idx < ordered.length; idx++) {
      const instance = ordered[idx];

      const textNode = instance.findOne(n =>
        n.type === "TEXT" && n.name === "Text"
      );

      if (textNode && textNode.type === "TEXT") {
        const font = textNode.fontName;
        if (font === figma.mixed) {
          await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        } else {
          await figma.loadFontAsync(font);
        }

        textNode.characters = `${idx + 1}`;
      }
    }

    figma.notify("Instâncias renumeradas!");
  }
};
