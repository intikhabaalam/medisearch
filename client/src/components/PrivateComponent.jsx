import React from 'react'
import useAuthStatus from '../hooks/useAuthStatus'
import Loader from './common/Loader'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

const PrivateComponent = () => {

    const { isLoggedIn, checkingUser } = useAuthStatus()
    const location = useLocation()

    if (checkingUser) {
        return <Loader />
    }


    return isLoggedIn ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />

}

export default PrivateComponent
