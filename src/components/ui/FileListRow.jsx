import React from 'react';
import { File } from 'lucide-react';

function FileListRow({ path }) {
  return (
    <div className="ca-file-row">
      <File size={14} className="ca-file-row-icon" />
      <code className="ca-file-row-path">{path}</code>
    </div>
  );
}

export default FileListRow;
