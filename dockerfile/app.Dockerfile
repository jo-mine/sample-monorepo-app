FROM oven/bun:1.3

RUN apt-get update && \
    apt-get install -y git curl vim locales && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN locale-gen ja_JP.UTF-8
ENV LANG ja_JP.UTF-8
RUN printf '%s\n' \
  'set encoding=utf-8' \
  'set fileencoding=utf-8' \
  'set fileencodings=utf-8,iso-2022-jp,euc-jp,sjis' \
  'set fileformats=unix,dos,mac' \
  'set ambiwidth=double' \
  > /root/.vimrc
