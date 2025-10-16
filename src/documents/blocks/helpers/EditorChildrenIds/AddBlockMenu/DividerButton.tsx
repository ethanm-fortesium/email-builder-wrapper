import React, { useEffect, useState } from 'react';

import { AddOutlined } from '@mui/icons-material';
import { Fade, IconButton } from '@mui/material';

type Props = {
  buttonElement: HTMLElement | null;
  onClick: () => void;
};
export default function DividerButton({ buttonElement, onClick }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function listener({ clientX, clientY }: MouseEvent) {
      if (!buttonElement) return;
      const rect = buttonElement.getBoundingClientRect();
      if (Math.abs(clientY - rect.y) < 20 && clientX > rect.x && clientX < rect.x + rect.width) {
        setVisible(true);
        return;
      }
      setVisible(false);
    }
    window.addEventListener('mousemove', listener);
    return () => window.removeEventListener('mousemove', listener);
  }, [buttonElement]);

  return (
    <Fade in={visible}>
      <IconButton
        size="small"
        sx={{
          p: 0.12,
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-10px)',
          bgcolor: 'brand.blue',
          color: 'primary.contrastText',
          zIndex: 'fab',
          '&:hover, &:active, &:focus': {
            bgcolor: 'brand.blue',
            color: 'primary.contrastText',
          },
        }}
        onClick={(ev) => {
          ev.stopPropagation();
          onClick();
        }}
      >
        <AddOutlined fontSize="small" />
      </IconButton>
    </Fade>
  );
}
