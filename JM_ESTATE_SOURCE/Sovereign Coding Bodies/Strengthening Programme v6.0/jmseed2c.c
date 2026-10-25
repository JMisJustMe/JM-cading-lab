
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <ctype.h>
#define MAXOPS 256
#define MAXBODY 127
#define MAXKIND 63
struct Op { uint8_t code; int32_t a; };

static uint32_t crc32_update(uint32_t crc, const unsigned char *buf, size_t len){
    crc=~crc;
    for(size_t i=0;i<len;i++){
        crc^=buf[i];
        for(int k=0;k<8;k++){
            crc=(crc>>1)^(0xEDB88320u & (-(int)(crc&1)));
        }
    }
    return ~crc;
}
static void put32le(FILE*f,uint32_t v){
    unsigned char b[4]={(unsigned char)v,(unsigned char)(v>>8),(unsigned char)(v>>16),(unsigned char)(v>>24)};
    fwrite(b,1,4,f);
}
static uint8_t codeof(const char*s){
    if(!strcmp(s,"SET")) return 1;
    if(!strcmp(s,"ADD")) return 2;
    if(!strcmp(s,"SUB")) return 3;
    if(!strcmp(s,"MUL")) return 4;
    if(!strcmp(s,"DIV")) return 5;
    if(!strcmp(s,"ROUTE")) return 6;
    if(!strcmp(s,"GATE")) return 7;
    if(!strcmp(s,"TRACE")) return 8;
    if(!strcmp(s,"MOVE")) return 9;
    if(!strcmp(s,"STORE")) return 10;
    if(!strcmp(s,"LOAD")) return 11;
    if(!strcmp(s,"EMIT")) return 12;
    if(!strcmp(s,"ASSERT_EQ")) return 13;
    if(!strcmp(s,"CHECKPOINT")) return 14;
    if(!strcmp(s,"HOLD")) return 15;
    if(!strcmp(s,"DING")) return 16;
    return 0;
}
static int hex64(const char*s){
    if(strlen(s)!=64) return 0;
    for(int i=0;i<64;i++) if(!isxdigit((unsigned char)s[i])) return 0;
    return 1;
}

int main(int ac,char**av){
    if(ac!=3){fprintf(stderr,"usage: jmseed2c in.jms2 out.jmb2\n");return 2;}
    FILE*f=fopen(av[1],"rb");
    if(!f){perror("open input");return 3;}
    char body[128]="",kind[64]="",govsha[65]="",line[1024],opn[40];
    struct Op ops[MAXOPS];
    int n=0,version=0,seen_seed=0;
    while(fgets(line,sizeof(line),f)){
        if(line[0]=='#'||line[0]=='\n'||line[0]=='\r') continue;
        if(sscanf(line,"JMSEED %d",&version)==1){seen_seed=1;continue;}
        if(sscanf(line,"BODY %127s",body)==1) continue;
        if(sscanf(line,"KIND %63s",kind)==1) continue;
        if(sscanf(line,"GOVSHA %64s",govsha)==1) continue;
        int a=0;
        int got=sscanf(line,"OP %39s %d",opn,&a);
        if(got>=1){
            uint8_t c=codeof(opn);
            if(!c||n>=MAXOPS){fprintf(stderr,"bad op or too many ops: %s\n",opn);fclose(f);return 4;}
            ops[n].code=c;
            ops[n].a=(got==2)?a:0;
            n++;
            continue;
        }
        fprintf(stderr,"unrecognised line: %s",line);
        fclose(f);
        return 5;
    }
    fclose(f);
    if(!seen_seed||version!=2||!body[0]||!kind[0]||!hex64(govsha)||n==0){
        fprintf(stderr,"missing/invalid fields\n");
        return 6;
    }
    size_t bl=strlen(body),kl=strlen(kind),gl=64;
    size_t payload_len=2+2+2+2+bl+kl+gl+(size_t)n*5;
    unsigned char*payload=(unsigned char*)calloc(1,payload_len);
    if(!payload) return 8;
    size_t p=0;
    #define W16(v) do { uint16_t _v=(uint16_t)(v); payload[p++]=(unsigned char)_v; payload[p++]=(unsigned char)(_v>>8); } while(0)
    W16(2);W16(bl);W16(kl);W16(n);
    memcpy(payload+p,body,bl);p+=bl;
    memcpy(payload+p,kind,kl);p+=kl;
    memcpy(payload+p,govsha,gl);p+=gl;
    for(int i=0;i<n;i++){
        payload[p++]=ops[i].code;
        uint32_t v=(uint32_t)ops[i].a;
        payload[p++]=(unsigned char)v;
        payload[p++]=(unsigned char)(v>>8);
        payload[p++]=(unsigned char)(v>>16);
        payload[p++]=(unsigned char)(v>>24);
    }
    if(p!=payload_len){free(payload);return 9;}
    uint32_t crc=crc32_update(0,payload,payload_len);
    FILE*o=fopen(av[2],"wb");
    if(!o){perror("open output");free(payload);return 10;}
    fwrite("JMB2",1,4,o);
    put32le(o,(uint32_t)payload_len);
    put32le(o,crc);
    fwrite(payload,1,payload_len,o);
    fclose(o);
    free(payload);
    printf("{\"state\":\"DING\",\"format\":\"JMB2\",\"body\":\"%s\",\"kind\":\"%s\",\"ops\":%d,\"crc32\":%u}\n",body,kind,n,crc);
    return 0;
}