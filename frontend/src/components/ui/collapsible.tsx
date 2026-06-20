"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

// Panel que se puede expandir/contraer con una animación. Son alias
// directos de Radix UI sin estilos propios: "Collapsible" es el
// contenedor, "CollapsibleTrigger" el botón que abre/cierra, y
// "CollapsibleContent" lo que se muestra u oculta.
const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
