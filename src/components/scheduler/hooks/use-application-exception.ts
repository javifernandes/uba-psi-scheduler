import { usePostHog } from "posthog-js/react";

type ApplicationExceptionSeverity = "critical" | "error" | "warning";

type LogParams = {
  error_type: string;
  context: Record<string, unknown>;
};

type LogApplicationExceptionParams = LogParams & {
  severity: ApplicationExceptionSeverity;
};

/**
 * Hook para reportar condiciones excepcionales de aplicación
 * por ejepmlo quisimos mostrar una encuesta pero no existe más
 * en posthog. El usuario no va a notar nada pero la plataforma
 * debe enterarse que ocurrió y ver qué sucedió en la configuración, etc.
 * Esto por ahora reporta en posthog y podemos tener alertas, etc.
 * En un futuro podría reportar en Sentry, etc.
 */
const useApplicationException = () => {
  const posthog = usePostHog();
  const captureAppException = ({
    error_type,
    severity,
    context,
  }: LogApplicationExceptionParams) => {
    posthog.capture("app_exception", {
      error_type,
      severity,
      context,
    });
  };

  const report =
    (severity: ApplicationExceptionSeverity) => (params: LogParams) => {
      captureAppException({ ...params, severity });
    };
  return {
    critical: report("critical"),
    error: report("error"),
    warning: report("warning"),
  };
};

export default useApplicationException;
