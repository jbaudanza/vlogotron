# NOTE: specifying latest seems to use ffmeg instead of avconv
# FROM ubuntu:latest
FROM ubuntu:14.04

#WORKDIR /build
#ADD https://libav.org/releases/libav-12.tar.gz libav-12.tar.gz
#RUN tar xzvf ./libav-12.tar.gz

#WORKDIR libav-12/
#RUN ./configure

#RUN \
#  apt-get update && \
#  DEBIAN_FRONTEND=noninteractive \
#    apt-get install -y \
#      libav-tools gpac \
#  && \
#  apt-get clean && \
#  rm -rf /var/lib/apt/lists/

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y libav-tools
