import React from 'react';

const DEFAULT_CANVAS_WIDTH = 600;

export type EmailLayoutContextValue = {
  canvasWidth: number;
};

export const EmailLayoutContext = React.createContext<EmailLayoutContextValue>({
  canvasWidth: DEFAULT_CANVAS_WIDTH,
});

export function useEmailLayoutContext() {
  return React.useContext(EmailLayoutContext);
}
