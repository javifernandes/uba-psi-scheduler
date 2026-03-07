import { useCallback, useEffect, useRef } from 'react';
import Shepherd from 'shepherd.js';

const TOUR_SEEN_STORAGE_KEY = 'uba_psico_scheduler_tour_seen_v1';
const AUTO_START_DELAY_MS = 360;
const TOUR_FOCUS_ATTR = 'data-tour-focus';
const TOUR_FOCUS_VALUE = 'active';

type UseSchedulerTourParams = {
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
  setIsMateriaPanelOpen,
  setIsMateriaDropdownOpen,
  setIsEleccionesPanelOpen,
  setIsMostrarPanelOpen,
  setIsSedesPanelOpen,
}: UseSchedulerTourParams) => {
  const tourRef = useRef<Shepherd.Tour | null>(null);

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

  const markTourAsSeen = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TOUR_SEEN_STORAGE_KEY, '1');
  }, []);

  const destroyTour = useCallback(() => {
    if (!tourRef.current) return;
    tourRef.current.cancel();
    tourRef.current = null;
    setBodyTourStep(null);
  }, [setBodyTourStep]);

  const startTour = useCallback(
    (force = false) => {
      if (typeof window === 'undefined') return;
      if (!force && window.localStorage.getItem(TOUR_SEEN_STORAGE_KEY) === '1') return;

      destroyTour();

      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          cancelIcon: { enabled: true },
          classes: 'uba-psi-tour',
          canClickTarget: true,
          scrollTo: { behavior: 'smooth', block: 'center' },
          buttons: [
            {
              text: 'Saltar',
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
      });
      tour.on('cancel', markTourAsSeen);
      tour.on('cancel', () => {
        setBodyTourStep(null);
        clearFocusedCard();
      });
      tour.on('show', () => {
        const currentStep = tour.getCurrentStep() as { id?: string } | null;
        setBodyTourStep(currentStep?.id || null);
      });

      tour.addSteps([
        {
          id: 'welcome',
          title: 'Bienvenido al scheduler',
          text: 'Aqui podras visualizar oferta academica y armar tu propuesta de inscripcion.',
          buttons: [
            {
              text: 'Saltar',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
            {
              text: 'Comenzar',
              action: () => tour.next(),
            },
          ],
        },
        {
          id: 'select-subject',
          title: 'Paso 1: elegir catedra',
          text: 'Busca y selecciona una catedra para ver disponibilidad en calendario.',
          attachTo: { element: '[data-tour="subject-panel"]', on: 'left' },
          beforeShowPromise: async () => {
            setIsMateriaPanelOpen(true);
            setIsMateriaDropdownOpen(true);
            await waitForSelector('[data-tour="subject-dropdown"]');
          },
          extraHighlights: ['[data-tour="subject-input"]', '[data-tour="subject-dropdown"]'],
          buttons: [
            {
              text: 'Saltar',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
          ],
          advanceOn: { selector: getSubjectOptionSelector, event: 'click' },
        },
        {
          id: 'calendar-overview',
          title: 'Paso 2: lectura general',
          text: 'Aca veras las comisiones de la catedra seleccionada.',
          attachTo: { element: '[data-tour="calendar-grid"]', on: 'top' },
          beforeShowPromise: async () => {
            await waitForAnySelector([getCommissionCardSelector, getInternalEventSelector]);
            focusCentralCard();
          },
        },
        {
          id: 'hover-commission',
          title: 'Paso 3: explora una comision',
          text: 'Acerca el mouse sobre una tarjeta interna para ver detalles y bloques asociados. Cuando lo hayas visto, usa "Siguiente".',
          attachTo: { element: getFocusedCardSelector, on: 'right' },
          beforeShowPromise: async () => {
            await waitForAnySelector([getCommissionCardSelector, getInternalEventSelector]);
            focusCentralCard();
          },
          showOn: () => Boolean(window.document.querySelector(getFocusedCardSelector)),
          buttons: [
            {
              text: 'Saltar',
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
          title: 'Paso 4: guarda una eleccion',
          text: 'Dentro de esta tarjeta, usa la estrella (abajo) para elegir esta comision y guardarla.',
          attachTo: { element: getFocusedCardSelector, on: 'right' },
          beforeShowPromise: async () => {
            await waitForAnySelector([getCommissionCardSelector, getInternalEventSelector]);
            if (!window.document.querySelector(getFocusedCardSelector)) {
              focusCentralCard();
            }
            await waitForSelector(getFocusedSaveButtonSelector, 1800);
          },
          showOn: () => Boolean(window.document.querySelector(getFocusedCardSelector)),
          buttons: [
            {
              text: 'Saltar',
              classes: 'shepherd-button-secondary',
              action: () => tour.cancel(),
            },
          ],
          advanceOn: { selector: getFocusedSaveButtonSelector, event: 'click' },
        },
        {
          id: 'saved-panel',
          title: 'Paso 5: Mis elecciones',
          text: 'Tu seleccion aparece aca. Puedes revisarla y quitarla cuando quieras.',
          attachTo: { element: '[data-tour="saved-elections-panel"]', on: 'left' },
          beforeShowPromise: async () => {
            setIsEleccionesPanelOpen(true);
          },
        },
        {
          id: 'export',
          title: 'Paso 6: exportar/importar',
          text: 'Exporta tus elecciones para guardar un backup o compartirlo e importarlo luego.',
          attachTo: { element: '[data-tour="saved-elections-export"]', on: 'bottom' },
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
          text: 'Filtra por sedes para comparar opciones de cursada.',
          attachTo: { element: '[data-tour="venue-filters-panel"]', on: 'left' },
          beforeShowPromise: async () => {
            setIsSedesPanelOpen(true);
          },
        },
        {
          id: 'clear-subject',
          title: 'Paso 9: modo calendario',
          text: 'Limpia la materia seleccionada para solo ver las comisiones que seleccionaste sin otras opciones.',
          attachTo: { element: getClearSubjectSelector, on: 'left' },
          showOn: () => Boolean(window.document.querySelector(getClearSubjectSelector)),
          buttons: [
            {
              text: 'Saltar',
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
      focusCentralCard,
      setBodyTourStep,
      setIsEleccionesPanelOpen,
      setIsMateriaDropdownOpen,
      setIsMateriaPanelOpen,
      setIsMostrarPanelOpen,
      setIsSedesPanelOpen,
      waitForAnySelector,
      waitForSelector,
    ]
  );

  useEffect(() => () => destroyTour(), [destroyTour]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(TOUR_SEEN_STORAGE_KEY) === '1') return;
    const timeoutId = window.setTimeout(() => {
      startTour(false);
    }, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [startTour]);

  return { startTour };
};
