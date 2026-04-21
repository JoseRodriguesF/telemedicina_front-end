"use client";

import React from 'react';
import Sidebar from './Sidebar/Sidebar';
import MobileHeader from './MobileHeader/MobileHeader';
import AIAssistant from '../AIAssistant/AIAssistant';
import '@/app/inicio/inicio.css';

import { useEffect } from 'react';
import axios from '@/lib/axios/config';
import { getToken } from '@/lib/auth';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    useEffect(() => {
        // Registrar atividade para status "Online" no admin
        const reportActivity = async () => {
            try {
                const token = getToken();
                if (!token) return;
                await axios.post('/api/audit/heartbeat', {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (e) {
                // Silencioso
            }
        };
        reportActivity();
        const interval = setInterval(reportActivity, 10 * 60 * 1000); // A cada 10 min
        return () => clearInterval(interval);
    }, []);
    return (
        <div className="inicio-page">
            <div className="inicio-mobile-header">
                <MobileHeader />
            </div>
            <Sidebar />
            <main className="inicio-main animate-fadeIn" style={{ animationDuration: '0.4s' }}>
                {children}
            </main>
            <AIAssistant />
        </div>
    );
}
