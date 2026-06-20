import { cn } from "@/lib/utils";

// Bloque gris con animación de "pulso" (animate-pulse), usado como
// marcador de posición mientras el contenido real todavía está
// cargando — evita que la pantalla se vea vacía o salte de tamaño
// cuando los datos llegan.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />;
}

export { Skeleton };
