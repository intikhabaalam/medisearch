import { createSlice } from '@reduxjs/toolkit'

let userExist = null
try {
    userExist = JSON.parse(localStorage.getItem("user"))
} catch {
    localStorage.removeItem("user")
}


const initialState = {
    user: userExist || null
}

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        register: (state, action) => {
            return {
                ...state,
                user: action.payload
            }
        },
        logoutUser: (state) => {
            return {
                ...state,
                user: null
            }
        },
        getProfile: (state, action) => {
            return {
                ...state,
                user: {
                    ...state.user,
                    ...action.payload
                }
            }
        }
    }
});

export const { register, getProfile, logoutUser } = authSlice.actions

export default authSlice.reducer
