import React from 'react';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      <div className="flex items-center p-6 bg-slate-50 border-b border-slate-200">
        <div className="mr-4 text-3xl">{icon}</div>
        <h2 className="text-2xl font-black text-slate-800">{title}</h2>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Panel;
