import { Toaster as Sonner } from "sonner";

// Envoltorio sobre la librería "sonner" para mostrar notificaciones
// flotantes ("toasts") con el estilo visual del sistema de diseño.
// Kollab no muestra notificaciones flotantes actualmente (los mensajes
// de error del login se muestran inline, dentro del propio formulario).
type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        // Cada clase usa el selector "group-[.toaster]" para heredar el
        // estilo del contenedor padre, sin tener que repetir las clases
        // de color en cada tipo de notificación.
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
