import React from 'react';

const DEFAULT_CANVAS_WIDTH = 600;

export type EmailLayoutContextValue = {
  canvasWidth: number;
};

export const EmailLayoutContext = React.createContext<EmailLayoutContextValue>({
  canvasWidth: DEFAULT_CANVAS_WIDTH,
});

/**
 * Access the current email layout context.
 *
 * @returns The current `EmailLayoutContext` value — an object with `canvasWidth: number`.
 */
export function useEmailLayoutContext() {
  return React.useContext(EmailLayoutContext);
}