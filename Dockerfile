FROM node:14-alpine as builder

ARG baseapi
ARG staticprefix
ARG VUE_APP_TRUSTED_DOMAINS
ARG VUE_APP_COOKIE_DOMAIN

ENV VUE_APP_BASE_API=${baseapi:-"/api/"} \
    VUE_APP_STATIC_PREFIX=${staticprefix:-"/"} \
    VUE_APP_TRUSTED_DOMAINS=${VUE_APP_TRUSTED_DOMAINS:-""} \
    VUE_APP_COOKIE_DOMAIN=${VUE_APP_COOKIE_DOMAIN:-""}

COPY . /workspace

RUN set -ex \
    && cd /workspace \
    && npm install -g npm@8 --registry=https://registry.npmmirror.com \
    && echo "npm version: "`npm -v` \
    && npm install --registry=https://registry.npmmirror.com \
    && npm run build


FROM nginx:stable

COPY --from=builder /workspace/dist /usr/share/nginx/html

RUN line=`grep -n 'location / {' /etc/nginx/conf.d/default.conf | awk -F ':' '{print $1}'` \
    && sed -i $line'a try_files $uri $uri/ /index.html;' /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
