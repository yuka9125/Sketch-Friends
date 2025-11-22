import React from 'react';
import { Toaster as HotToaster } from 'react-hot-toast';

export const Toaster = () => {
  return (
    <HotToaster
      position="top-center"
      toastOptions={{
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
          fontSize: '16px'
        },
      }}
    />
  );
};
