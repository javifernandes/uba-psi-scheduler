import { useCallback, useEffect, useRef } from 'react';
import Shepherd, { type Tour } from 'shepherd.js';

const TOUR_SEEN_STORAGE_KEY = 'uba_psico_scheduler_tour_seen_v1';
const TOUR_ACTIVE_STORAGE_KEY = 'uba_psico_scheduler_tour_active_v1';
const TOUR_BACKUP_STORAGE_KEY = 'uba_psico_scheduler_tour_backup_v1';
const AUTO_START_DELAY_MS = 360;
const TOUR_FOCUS_ATTR = 'data-tour-focus';
const TOUR_FOCUS_VALUE = 'active';
const TOUR_UNBLUR_ATTR = 'data-tour-unblur';
const TOUR_UNBLUR_VALUE = 'active';
const TOUR_TARGET_TEMP_POSITION_ATTR = 'data-tour-temp-position';
const TOUR_TARGET_TEMP_Z_ATTR = 'data-tour-temp-z';

type UseSchedulerTourParams = {
  selectedSubjectId: string;
  setSelectedSubjectId: (value: string) => void;
  enrolledBySubject: Record<string, string>;
  setEnrolledBySubject: (value: Record<string, string>) => void;
  setIsMateriaPanelOpen: (value: boolean) => void;
  setIsMateriaDropdownOpen: (value: boolean) => void;
  setIsEleccionesPanelOpen: (value: boolean) => void;
  setIsMostrarPanelOpen: (value: boolean) => void;
  setIsSedesPanelOpen: (value: boolean) => void;
};

const getSubjectOptionSelector = '[data-tour="subject-option"]';
const getCommissionCardSelector = '[data-tour-card="internal-commission"]';
const getInternalEventSelector = '[data-tour-internal="true"]';
const getSaveButtonSelector = '[data-tour="event-save-toggle"]';
const getClearSubjectSelector = '[data-tour="clear-selected-subject"]';
const getFocusedCardSelector = `[${TOUR_FOCUS_ATTR}="${TOUR_FOCUS_VALUE}"]`;
const getFocusedSaveButtonSelector = `${getFocusedCardSelector} ${getSaveButtonSelector}`;

export const useSchedulerTour = ({
  selectedSubjectId,
  setSelectedSubjectId,
  enrolledBySubject,
  setEnrolledBySubject,
  setIsMateriaPanelOpen,
  setIsMateriaDropdownOpen,
  setIsEleccionesPanelOpen,
  setIsMostrarPanelOpen,
  setIsSedesPanelOpen,
}: UseSchedulerTourParams) => {
  const tourRef = useRef<Tour | null>(null);
  const tourStatePreparedRef = useRef(false);
  const autoStartTimeoutRef = useRef<number | null>(null);

  const setBodyTourStep = useCallback((stepId: string | null) => {
    if (typeof window === 'undefined') return;
    if (stepId) {
      window.document.body.dataset.schedulerTourStep = stepId;
      window.dispatchEvent(
        new CustomEvent('scheduler-tour-step-change', {
          detail: { stepId },
        })
      );
      return;
    }
    delete window.document.body.dataset.schedulerTourStep;
    window.dispatchEvent(
      new CustomEvent('scheduler-tour-step-change', {
        detail: { stepId: null },
      })
    );
  }, []);

  const waitForSelector = useCallback((selector: string, timeoutMs = 4500) => {
    if (typeof window === 'undefined') return Promise.resolve();
    return new Promise<void>(resolve => {
      if (window.document.querySelector(selector)) {
        resolve();
        return;
      }
      const startedAt = Date.now();
      const intervalId = window.setInterval(() => {
        const hasTarget = Boolean(window.document.querySelector(selector));
        const didTimeout = Date.now() - startedAt >= timeoutMs;
        if (hasTarget || didTimeout) {
          window.clearInterval(intervalId);
          resolve();
        }
      }, 80);
    });
  }, []);

  const waitForAnySelector = useCallback((selectors: string[], timeoutMs = 7000) => {
    if (typeof window === 'undefined') return Promise.resolve();
    return new Promise<void>(resolve => {
      if (selectors.some(selector => window.document.querySelector(selector))) {
        resolve();
        return;
      }
      const startedAt = Date.now();
      const intervalId = window.setInterval(() => {
        const hasTarget = selectors.some(selector => window.document.querySelector(selector));
        const didTimeout = Date.now() - startedAt >= timeoutMs;
        if (hasTarget || didTimeout) {
          window.clearInterval(intervalId);
          resolve();
        }
      }, 80);
    });
  }, []);

  const clearFocusedCard = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.document.querySelectorAll(getFocusedCardSelector).forEach(node => {
      node.removeAttribute(TOUR_FOCUS_ATTR);
    });
  }, []);

  const clearUnblurCards = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.document.querySelectorAll(`[${TOUR_UNBLUR_ATTR}="${TOUR_UNBLUR_VALUE}"]`).forEach(node => {
      node.removeAttribute(TOUR_UNBLUR_ATTR);
    });
  }, []);

  const clearSpotlightTargetLayering = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.document
      .querySelectorAll<HTMLElement>(`.shepherd-target.shepherd-enabled[${TOUR_TARGET_TEMP_Z_ATTR}="1"]`)
      .forEach(node => {
        node.style.removeProperty('z-index');
        node.removeAttribute(TOUR_TARGET_TEMP_Z_ATTR);
      });
    window.document
      .querySelectorAll<HTMLElement>(
        `.shepherd-target.shepherd-enabled[${TOUR_TARGET_TEMP_POSITION_ATTR}="1"]`
      )
      .forEach(node => {
        node.style.removeProperty('position');
        node.removeAttribute(TOUR_TARGET_TEMP_POSITION_ATTR);
      });
  }, []);

  const applySpotlightTargetLayering = useCallback(() => {
    if (typeof window === 'undefined') return;
    clearSpotlightTargetLayering();
    window.document.querySelectorAll<HTMLElement>('.shepherd-target.shepherd-enabled').forEach(node => {
      const computedPosition = window.getComputedStyle(node).position;
      if (computedPosition === 'static') {
        node.style.position = 'relative';
        node.setAttribute(TOUR_TARGET_TEMP_POSITION_ATTR, '1');
      }
      node.style.zIndex = '10015';
      node.setAttribute(TOUR_TARGET_TEMP_Z_ATTR, '1');
    });
  }, [clearSpotlightTargetLayering]);

  const chooseCentralCard = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const doc = window.document;
    const preferredCards = Array.from(
      doc.querySelectorAll<HTMLElement>('[data-tour-card-kind="internal-commission"]')
    );
    const fallbackCards = Array.from(doc.querySelectorAll<HTMLElement>(getInternalEventSelector));
    const cards = preferredCards.length ? preferredCards : fallbackCards;
    if (!cards.length) return null;

    const calendarNode = doc.querySelector<HTMLElement>('[data-tour="calendar-grid-layout"]');
    const calendarRect = calendarNode?.getBoundingClientRect();
    const targetX = calendarRect
      ? calendarRect.left + calendarRect.width / 2
      : window.innerWidth / 2;
    const targetY = calendarRect
      ? calendarRect.top + calendarRect.height / 2
      : window.innerHeight / 2;

    const scored = cards
      .map(card => {
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = cx - targetX;
        const dy = cy - targetY;
        const distance = Math.hypot(dx, dy);
        const sizeBoost = Math.min(rect.width * rect.height / 1200, 18);
        const stackSize = Number.parseInt(card.dataset.stackSize || '1', 10);
        const rightBiasPenalty = dx < 0 ? Math.min(Math.abs(dx) * 0.12, 22) : 0;
        const lowerBiasPenalty = dy < 0 ? Math.min(Math.abs(dy) * 0.1, 18) : 0;
        const stackedSlotBoost = stackSize > 1 ? 16 : 0;
        return {
          card,
          score: distance + rightBiasPenalty + lowerBiasPenalty - sizeBoost - stackedSlotBoost,
        };
      })
      .sort((a, b) => a.score - b.score);

    return scored[0]?.card || null;
  }, []);

  const focusCentralCard = useCallback(() => {
    clearFocusedCard();
    const card = chooseCentralCard();
    if (!card) return false;
    card.setAttribute(TOUR_FOCUS_ATTR, TOUR_FOCUS_VALUE);
    return true;
  }, [chooseCentralCard, clearFocusedCard]);

  const highlightFocusedAndRelatedCards = useCallback(() => {
    if (typeof window === 'undefined') return;
    clearUnblurCards();
    const focusedCard = window.document.querySelector<HTMLElement>(getFocusedCardSelector);
    if (!focusedCard) return;
    focusedCard.setAttribute(TOUR_UNBLUR_ATTR, TOUR_UNBLUR_VALUE);
    const commissionId = focusedCard.dataset.commissionId;
    if (!commissionId) return;
    window.document
      .querySelectorAll<HTMLElement>(
        `[data-tour-internal="true"][data-commission-id="${commissionId}"]`
      )
      .forEach(node => node.setAttribute(TOUR_UNBLUR_ATTR, TOUR_UNBLUR_VALUE));
  }, [clearUnblurCards]);

  const markTourAsSeen = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOUR_SEEN_STORAGE_KEY, '1');
  }, []);

  const buildBackupSnapshot = useCallback(
    () =>
      JSON.stringify({
        selectedSubjectId,
        enrolledBySubject,
      }),
    [enrolledBySubject, selectedSubjectId]
  );

  const restoreFromBackup = useCallback(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(TOUR_BACKUP_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        selectedSubjectId?: string;
        enrolledBySubject?: Record<string, string>;
      };
      setSelectedSubjectId(parsed.selectedSubjectId || '');
      setEnrolledBySubject(parsed.enrolledBySubject || {});
    } catch {
      // no-op
    } finally {
      window.localStorage.removeItem(TOUR_BACKUP_STORAGE_KEY);
      window.localStorage.removeItem(TOUR_ACTIVE_STORAGE_KEY);
      tourStatePreparedRef.current = false;
    }
  }, [setEnrolledBySubject, setSelectedSubjectId]);

  const prepareTourStateForRun = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (tourStatePreparedRef.current) return;
    window.localStorage.setItem(TOUR_BACKUP_STORAGE_KEY, buildBackupSnapshot());
    window.localStorage.setItem(TOUR_ACTIVE_STORAGE_KEY, '1');
    tourStatePreparedRef.current = true;
    setSelectedSubjectId('');
    setEnrolledBySubject({});
  }, [buildBackupSnapshot, setEnrolledBySubject, setSelectedSubjectId]);

  const reinforceSubjectStepOpenState = useCallback(() => {
    setIsMateriaPanelOpen(true);
    setIsMateriaDropdownOpen(true);
    if (typeof window === 'undefined') return;
    const focusInput = () => {
      const input = window.document.querySelector<HTMLInputElement>('[data-tour="subject-input"]');
      input?.focus();
      input?.click();
    };
    focusInput();
    window.setTimeout(() => {
      setIsMateriaPanelOpen(true);
      setIsMateriaDropdownOpen(true);
      focusInput();
    }, 40);
    window.setTimeout(() => {
      setIsMateriaPanelOpen(true);
      setIsMateriaDropdownOpen(true);
      focusInput();
    }, 140);
  }, [setIsMateriaDropdownOpen, setIsMateriaPanelOpen]);

  const destroyTour = useCallback(() => {
    if (!tourRef.current) return;
    tourRef.current.cancel();
    tourRef.current = null;
    setBodyTourStep(null);
  }, [setBodyTourStep]);

  const startTour = useCallback(
    (force = false) => {
      if (typeof window === 'undefined') return;
      if (autoStartTimeoutRef.current !== null) {
        window.clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
      if (!force && window.localStorage.getItem(TOUR_SEEN_STORAGE_KEY) === '1') return;

      destroyTour();
      tourStatePreparedRef.current = false;

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: { enabled: true },
          classes: 'uba-psi-tour',
          canClickTarget: true,
          scrollTo: { behavior: 'smooth', block: 'center' },
          buttons: [
            {
              text: 'Cancelar y salir del tour',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
            {
              text: 'Siguiente',
              action: () => tour.next(),
            },
          ],
        },
      });

      tour.on('complete', markTourAsSeen);
      tour.on('complete', () => {
        setBodyTourStep(null);
        clearFocusedCard();
        clearUnblurCards();
        clearSpotlightTargetLayering();
        restoreFromBackup();
      });
      tour.on('cancel', markTourAsSeen);
      tour.on('cancel', () => {
        setBodyTourStep(null);
        clearFocusedCard();
        clearUnblurCards();
        clearSpotlightTargetLayering();
        restoreFromBackup();
      });
      tour.on('show', () => {
        const currentStep = tour.getCurrentStep() as { id?: string } | null;
        const stepId = currentStep?.id || null;
        setBodyTourStep(stepId);
        if (stepId === 'hover-commission' || stepId === 'save-commission') {
          if (!window.document.querySelector(getFocusedCardSelector)) {
            focusCentralCard();
          }
          highlightFocusedAndRelatedCards();
        } else {
          clearUnblurCards();
        }
        applySpotlightTargetLayering();
      });

      tour.addSteps([
        {
          id: 'welcome',
          title: 'Bienvenido al planificador',
          text: 'Aqui podras visualizar la oferta academica y armar tu propuesta de inscripcion.\n\nHagamos un recorrido posible para entender como ver las opciones de una materia y elegirla.',
          buttons: [
            {
              text: 'Cancelar y salir del tour',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
            {
              text: 'Comenzar',
              action: () => {
                prepareTourStateForRun();
                tour.next();
              },
            },
          ],
        },
        {
          id: 'select-subject',
          title: 'Paso 1: elegir catedra',
          text: 'Busca y selecciona una catedra para ver su disponibilidad en calendario.',
          attachTo: { element: '[data-tour="subject-panel"]', on: 'left' },
          beforeShowPromise: async () => {
            setBodyTourStep('select-subject');
            reinforceSubjectStepOpenState();
            await new Promise(resolve => window.setTimeout(resolve, 120));
          },
          when: {
            show: () => reinforceSubjectStepOpenState(),
          },
          extraHighlights: ['[data-tour="subject-input"]', '[data-tour="subject-dropdown"]'],
          buttons: [
            {
              text: 'Cancelar y salir del tour',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
          ],
          advanceOn: {
            selector: `${getSubjectOptionSelector}, ${getSubjectOptionSelector} *`,
            event: 'click',
          },
        },
        {
          id: 'calendar-overview',
          title: 'Paso 2: oferta academica',
          text: 'Aca veras la oferta de comisiones y horarios de la catedra seleccionada. Ademas, si tienes alguna materia ya guardada tambien se vera para poder identificar conflictos.',
          attachTo: { element: '[data-tour="calendar-grid"]', on: 'top' },
          beforeShowPromise: async () => {
            await waitForAnySelector([getCommissionCardSelector, getInternalEventSelector]);
            focusCentralCard();
            highlightFocusedAndRelatedCards();
          },
        },
        {
          id: 'hover-commission',
          title: 'Paso 3: explora una comision',
          text: 'Acerca el mouse sobre una oferta de comision para ver detalles y bloques asociados. Cuando lo hayas visto, usa "Siguiente".',
          attachTo: { element: getFocusedCardSelector, on: 'right' },
          beforeShowPromise: async () => {
            await waitForAnySelector([getCommissionCardSelector, getInternalEventSelector]);
            focusCentralCard();
          },
          showOn: () => Boolean(window.document.querySelector(getFocusedCardSelector)),
          buttons: [
            {
              text: 'Cancelar y salir del tour',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
            {
              text: 'Siguiente',
              action: () => tour.next(),
            },
          ],
        },
        {
          id: 'save-commission',
          title: 'Paso 4: elegir una comision',
          text: 'Dentro de esta tarjeta, usa la estrella (abajo) para elegir esta comision y guardarla.',
          attachTo: { element: getFocusedCardSelector, on: 'top' },
          beforeShowPromise: async () => {
            await waitForAnySelector([getCommissionCardSelector, getInternalEventSelector]);
            if (!window.document.querySelector(getFocusedCardSelector)) {
              focusCentralCard();
            }
            highlightFocusedAndRelatedCards();
            await waitForSelector(getFocusedSaveButtonSelector, 1800);
          },
          showOn: () => Boolean(window.document.querySelector(getFocusedCardSelector)),
          buttons: [
            {
              text: 'Cancelar y salir del tour',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
          ],
          advanceOn: { selector: getFocusedSaveButtonSelector, event: 'click' },
        },
        {
          id: 'saved-panel',
          title: 'Paso 5: Mis elecciones',
          text: 'Aca veras la lista de materias/comisiones que elegiste hasta ahora. Este es tu estado de propuesta de inscripcion.',
          attachTo: { element: '[data-tour="saved-elections-panel"]', on: 'left' },
          beforeShowPromise: async () => {
            setIsEleccionesPanelOpen(true);
          },
        },
        {
          id: 'export',
          title: 'Paso 6: exportar/importar',
          text: 'Exporta tus elecciones para guardar un backup e importarlo luego. Opcionalmente puedes compartir esta informacion con otros o volver a importarla mas tarde. Esto te permitira probar varias alternativas de cursada, empezar de cero y luego volver a una propuesta.',
          attachTo: { element: '[data-tour="saved-elections-export"]', on: 'top' },
          extraHighlights: ['[data-tour="saved-elections-panel"]'],
          beforeShowPromise: async () => {
            setIsEleccionesPanelOpen(true);
          },
          showOn: () => Boolean(window.document.querySelector('[data-tour="saved-elections-export"]')),
        },
        {
          id: 'content-filters',
          title: 'Paso 7: tipo de contenido',
          text: 'Activa o desactiva la visualizacion de comisiones, teoricos, seminarios y otras materias.',
          attachTo: { element: '[data-tour="content-filters-panel"]', on: 'left' },
          beforeShowPromise: async () => {
            setIsMostrarPanelOpen(true);
          },
        },
        {
          id: 'venue-filters',
          title: 'Paso 8: sedes',
          text: 'Filtra lo que se ve en el calendario por sedes para comparar opciones de cursada.',
          attachTo: { element: '[data-tour="venue-filters-panel"]', on: 'left' },
          beforeShowPromise: async () => {
            setIsSedesPanelOpen(true);
          },
        },
        {
          id: 'clear-subject',
          title: 'Paso 9: modo calendario',
          text: 'Limpia la materia seleccionada para solo ver las comisiones que seleccionaste sin otras opciones.',
          attachTo: { element: getClearSubjectSelector, on: 'left-start' },
          showOn: () => Boolean(window.document.querySelector(getClearSubjectSelector)),
          buttons: [
            {
              text: 'Cancelar y salir del tour',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
          ],
          advanceOn: { selector: getClearSubjectSelector, event: 'click' },
        },
        {
          id: 'calendar-end',
          title: 'Listo',
          text: 'Ahora puedes evaluar como queda tu calendario con las materias elegidas.\n\nA continuacion puedes repetir el proceso seleccionando otra catedra. El sistema recordara y mostrara tu seleccion asi como tambien detectara potenciales conflictos.',
          attachTo: { element: '[data-tour="calendar-grid"]', on: 'top' },
          buttons: [
            {
              text: 'Cerrar',
              action: () => tour.complete(),
            },
          ],
        },
      ]);

      tourRef.current = tour;
      tour.start();
    },
    [
      destroyTour,
      markTourAsSeen,
      clearFocusedCard,
      clearUnblurCards,
      clearSpotlightTargetLayering,
      applySpotlightTargetLayering,
      highlightFocusedAndRelatedCards,
      focusCentralCard,
      buildBackupSnapshot,
      prepareTourStateForRun,
      reinforceSubjectStepOpenState,
      setBodyTourStep,
      setEnrolledBySubject,
      setIsEleccionesPanelOpen,
      setIsMateriaDropdownOpen,
      setIsMateriaPanelOpen,
      setIsMostrarPanelOpen,
      setIsSedesPanelOpen,
      setSelectedSubjectId,
      restoreFromBackup,
      waitForAnySelector,
      waitForSelector,
    ]
  );

  useEffect(
    () => () => {
      destroyTour();
      clearSpotlightTargetLayering();
    },
    [clearSpotlightTargetLayering, destroyTour]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(TOUR_ACTIVE_STORAGE_KEY) !== '1') return;
    restoreFromBackup();
  }, [restoreFromBackup]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(TOUR_SEEN_STORAGE_KEY) === '1') return;
    autoStartTimeoutRef.current = window.setTimeout(() => {
      autoStartTimeoutRef.current = null;
      if (tourRef.current) return;
      startTour(false);
    }, AUTO_START_DELAY_MS);
    return () => {
      if (autoStartTimeoutRef.current !== null) {
        window.clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
      }
    };
  }, [startTour]);

  useEffect(() => {
    const tour = tourRef.current;
    if (!tour) return;
    if (!selectedSubjectId) return;
    const currentStep = tour.getCurrentStep() as { id?: string } | null;
    if (currentStep?.id !== 'select-subject') return;
    tour.next();
  }, [selectedSubjectId]);

  return { startTour };
};
