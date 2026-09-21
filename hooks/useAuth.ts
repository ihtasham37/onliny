
import React, { useContext } from 'react';
import { AppContext, defaultAppContextValue } from '../context/AppContext';

export const useAuth = () => {
  const context = useContext(AppContext) || defaultAppContextValue;
  const { user, userData, login, register, vendorRegister, updateVendorProfile, logout } = context;
  return { user, userData, login, register, vendorRegister, updateVendorProfile, logout };
};
