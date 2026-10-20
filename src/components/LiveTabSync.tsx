import React from 'react';
import { LiveWebProxyBrowser } from './LiveWebProxyBrowser';

export { LiveWebProxyBrowser };

export const LiveTabSync: React.FC<any> = (props) => {
  return <LiveWebProxyBrowser {...props} />;
};
