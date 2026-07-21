
// web用户配置
export const authConfig = {
    tokenExpirySeconds: 21600, // web token过期时间
    register: false, // 是否开启注册
    qqLogin: true, // 是否开启QQ登录
    qqRegister: true, // 是否开启QQ注册，开启此项必须先开启 qqLogin
}

// 通用配置
export const config = {
    serverName: '珲日青MC服务器', // 服务器名称
    mcServerIp: null // mc服务器地址，null为自动获取主机名
}

// Yggdrasil配置
export const yggdrasilConfig = {
    accessTokenExpirySeconds: 8 * 24 * 60 * 60, // accessToken过期时间
    joinServerExpirySeconds: 60, // 客户端进入服务器超时时间
    mixedAuth: true,// 是否开启正版混合认证
}