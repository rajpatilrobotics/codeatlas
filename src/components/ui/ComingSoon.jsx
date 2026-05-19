import React from 'react';
import Badge from './Badge';

function ComingSoon({ children }) {
  return (
    <div className="ca-coming-soon-wrap">
      <Badge variant="info" className="ca-coming-soon-badge">
        Preview
      </Badge>
      {children}
    </div>
  );
}

export default ComingSoon;
