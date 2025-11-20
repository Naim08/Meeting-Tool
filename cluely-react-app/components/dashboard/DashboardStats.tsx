'use client';

import React from 'react';
import type { CalendarEvent } from '@/lib/google-calendar';

interface DashboardStatsProps {
    events: CalendarEvent[];
    loading: boolean;
}

export function DashboardStats({ events, loading }: DashboardStatsProps) {
    // Calculate stats - memoized to prevent unnecessary recalculations
    const { meetingsToday, meetingsThisWeek, interviewsThisWeek } = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const meetingsToday = events.filter(e => {
            const date = new Date(e.start_time);
            return date >= today && date < tomorrow;
        }).length;

        const meetingsThisWeek = events.filter(e => {
            const date = new Date(e.start_time);
            return date >= today && date < nextWeek;
        }).length;

        // Mock "Interviews" count for now since we don't have a separate type yet
        // In a real app, we'd filter by event type or title keywords
        const interviewsThisWeek = events.filter(e =>
            (e.summary || '').toLowerCase().includes('interview') ||
            (e.description || '').toLowerCase().includes('interview')
        ).length;

        return { meetingsToday, meetingsThisWeek, interviewsThisWeek };
    }, [events]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    const stats = [
        {
            label: 'Meetings Today',
            value: meetingsToday,
            icon: (
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'bg-blue-50 text-blue-700',
        },
        {
            label: 'This Week',
            value: meetingsThisWeek,
            icon: (
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            color: 'bg-purple-50 text-purple-700',
        },
        {
            label: 'Interviews',
            value: interviewsThisWeek,
            icon: (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'bg-green-50 text-green-700',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.color}`}>
                            {stat.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
