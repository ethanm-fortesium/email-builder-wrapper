// Legacy presentational attributes that email HTML relies on (classic Outlook and
// clients that strip CSS still honour them). React renders them as-is (bgcolor).
import 'react';

declare module 'react' {
  interface TableHTMLAttributes<T> {
    bgColor?: string;
  }
  interface TdHTMLAttributes<T> {
    bgColor?: string;
    /** As bgColor; React renders it without warning in the live editor canvas too. */
    bgcolor?: string;
  }
  interface ThHTMLAttributes<T> {
    bgcolor?: string;
    width?: number | string;
    valign?: 'top' | 'middle' | 'bottom' | 'baseline';
  }
  interface ImgHTMLAttributes<T> {
    /** Stops older Outlook versions drawing a border round linked images. */
    border?: number | string;
  }
}
