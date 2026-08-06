import { createContext, useContext, useEffect, useState } from "react";
import API from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
export const AuthProvider = ({children}) =>{
    const [user,setUser] = useState(()=>{
        const stored = localStorage.setItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading,setLoading] = useState(false);

    const login = async(email,password) => {
        setLoading(true);
        try {
            const res = await API.post('/login',{email,password});
            const {user,token} = res.data;
            localStorage.getItem('token',token);
            localStorage.getItem('user',JSON.stringify(user));
            setUser(user);
            return {success:true,user};
        } catch (error) {
            return {success:false,mesaage:'Login Failed'};
        }finally{
            setLoading(false);
        }
    };
    const register = async(data)=>{
        setLoading(true);
        try{
        const res = await API.post('/register',data);
        const {user,token} = res.data;
        localStorage.setItem('token',token);
        localStorage.setItem('user',JSON.stringify(user));
        setUser(user);
        return {success:true,user}
        }catch(error){
            return { success:false, message:'Failed to Register !'}
        }finally{
            setLoading(false);
        }
    };
    const logout = ()=>{
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };
    return(
        <AuthContext.Provider value={{user,login,register,logout,loading}}>
            {children}
        </AuthContext.Provider>
    );
};
