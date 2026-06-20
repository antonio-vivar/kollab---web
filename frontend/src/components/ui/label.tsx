"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Estilo base de cualquier etiqueta de formulario. Se usa cva aunque
// solo haya un estilo (sin variantes) para mantener la misma estructura
// que el resto de los componentes de shadcn/ui.
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

// Envuelve el <Label> de Radix UI, que internamente asocia la etiqueta
// con su campo (por "htmlFor"/"id") para que hacer clic en el texto
// también enfoque el input correspondiente — mejora de accesibilidad
// que un <label> nativo ya tendría, pero aquí queda explícita.
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
