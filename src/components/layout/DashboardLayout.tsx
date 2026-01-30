"use client";

import React from 'react';
import Sidebar from './Sidebar/Sidebar';
import MobileHeader from './MobileHeader/MobileHeader';
import '@/app/inicio/inicio.css';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="inicio-page">
            <div className="inicio-mobile-header">
                <MobileHeader />
            </div>
            <Sidebar />
            <main className="inicio-main">
                {children}
            </main>
        </div>
    );
}
