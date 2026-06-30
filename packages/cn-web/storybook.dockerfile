# piparo PUI web Storybook (the cn-web showroom), served by nginx under pui.piparo.tech/storybook/.
# Decoupled from the registry image so a heavy/fragile Storybook build never blocks the registry
# deploy. The storybook-static is built in CI (pnpm --filter @piparo/cn-web build-storybook) and
# copied in, so this image is just a static host. Build context = piparo-platform monorepo root:
#   pnpm --filter @piparo/cn-web build-storybook
#   docker build -f packages/cn-web/storybook.dockerfile -t ghcr.io/piparotech/cn-web-storybook .

FROM nginx:alpine
LABEL org.opencontainers.image.source=https://github.com/piparotech/piparo-platform
COPY packages/cn-web/storybook-static /usr/share/nginx/html/storybook
COPY packages/cn-web/storybook-nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
