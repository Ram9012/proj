import React from 'react';

export default function StatusBadge({ status }) {
    if (!status) return null;

    const map = {
        active: { cls: 'badge-active', icon: '✅', label: 'Active' },
        revoked: { cls: 'badge-revoked', icon: '🚫', label: 'Revoked' },
        pending: { cls: 'badge-pending', icon: '⏳', label: 'Pending' },
    };

    const { cls, icon, label } = map[status.toLowerCase()] || map.pending;

    return (
        <span className={`badge ${cls}`}>
            {icon} {label}
        </span>
    );
}
