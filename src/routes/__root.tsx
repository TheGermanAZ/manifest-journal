import { Outlet, createRootRoute } from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  return <Outlet />
}
