import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// "cva" (class-variance-authority) define todas las combinaciones de
// estilo posibles del botón a partir de dos variantes: "variant" (color/
// énfasis visual) y "size" (tamaño). En vez de escribir un if/else por
// cada combinación, se declaran como un mapa y cva arma la clase final.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9", // botón cuadrado, pensado para contener solo un ícono
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  // Si es true, en vez de renderizar un <button> propio, le pasa todas
  // sus clases y comportamiento al elemento hijo (vía Radix Slot). Sirve
  // para que, por ejemplo, un <Link> se vea exactamente como un botón.
  asChild?: boolean;
}

// forwardRef permite que un componente padre (por ejemplo, un formulario)
// obtenga una referencia directa al <button> del DOM, útil para hacer
// foco programático u otras manipulaciones imperativas.
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button"; // nombre visible en las herramientas de desarrollo de React

export { Button, buttonVariants };
