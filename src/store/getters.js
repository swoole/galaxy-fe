const getters = {
  sidebar: state => state.app.sidebar,
  device: state => state.app.device,
  token: state => state.user.token,
  user: state => state.user.user,
  orgId: state => state.user.lastOrg.alias || state.user.lastOrg.id
}
export default getters
