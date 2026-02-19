import React from 'react';
import NavBar from './NavBar';

export default function Layout({ children }) {
    return (
        <>
            <NavBar />
            <main className="page">
                <div className="container">
                    {children}
                </div>
            </main>
        </>
    );
}
