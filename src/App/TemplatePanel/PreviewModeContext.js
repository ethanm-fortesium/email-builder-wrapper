import React, { createContext, useContext } from 'react';

const PreviewModeContext = createContext(false);
export const PreviewModeProvider = PreviewModeContext.Provider;
export const usePreviewMode = () => useContext(PreviewModeContext);