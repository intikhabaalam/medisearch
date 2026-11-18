import { useSelector } from "react-redux"

const useAuthStatus = () => {
    const { user } = useSelector(s => s.auth)
    return { isLoggedIn: !!user, checkingUser: false }
}

export default useAuthStatus