import React, { useState } from "react";
import Sidebar from "../components/ui/Sidebar"; // ajusta ruta
import Header from "../components/ui/Header";   // si tienes header
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((v) => !v)}
      />

      {/* ✅ ESTE ES EL FIX: deja espacio al sidebar */}
      <main
        className={`min-h-screen transition-[margin] duration-300 ${
          isCollapsed ? "ml-16" : "ml-60"
        }`}
      >
        {/* si tienes header fijo, aquí va */}
        {/* <Header /> */}

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
