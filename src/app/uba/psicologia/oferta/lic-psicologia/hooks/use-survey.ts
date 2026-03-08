import { DisplaySurveyType } from "posthog-js";
import useApplicationException from "./use-application-exception";
import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";

/**
 * Trigger a survey on demand
 */
const useSurvey = () => {
  const logger = useApplicationException();
  const posthog = usePostHog();

  const launchSurvey = useCallback(
    ({ surveyId }: { surveyId: string }) => {
      posthog.onSurveysLoaded((surveys, context) => {
        if (context?.error) {
          logger.error({
            error_type: "posthog_surveys_loaded_error",
            context: { error: context.error },
          });
          return;
        }
        if (!surveys.some((s) => s.id === surveyId)) {
          logger.error({
            error_type: "missing_survey_id",
            context: { survey_id: surveyId },
          });
          return;
        }
        posthog.displaySurvey(surveyId, {
          displayType: DisplaySurveyType.Popover,
          selector: "#survey-container",
          ignoreDelay: true,
          ignoreConditions: true,
        });
        posthog.capture("survey_triggered", {
          survey_id: surveyId,
        });
      });
    },
    [logger, posthog],
  );

  return {
    launchSurvey,
  };
};

export default useSurvey;
