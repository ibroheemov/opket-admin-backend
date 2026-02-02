export interface User {
    id: number;
    phone: string;
    password: string; // hashed
    role: 'admin';
}
