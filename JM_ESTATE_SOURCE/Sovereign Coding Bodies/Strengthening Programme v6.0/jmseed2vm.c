
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#define MAXPAYLOAD (1024*1024)
#define MAXOPS 256
static uint16_t r16(const unsigned char*b){return (uint16_t)b[0]|((uint16_t)b[1]<<8);}
static uint32_t r32(const unsigned char*b){return (uint32_t)b[0]|((uint32_t)b[1]<<8)|((uint32_t)b[2]<<16)|((uint32_t)b[3]<<24);}
static uint32_t crc32_update(uint32_t crc,const unsigned char*buf,size_t len){
    crc=~crc;
    for(size_t i=0;i<len;i++){
        crc^=buf[i];
        for(int k=0;k<8;k++) crc=(crc>>1)^(0xEDB88320u&(-(int)(crc&1)));
    }
    return ~crc;
}
int main(int ac,char**av){
    if(ac!=2){fprintf(stderr,"usage: jmseed2vm body.jmb2\n");return 2;}
    FILE*f=fopen(av[1],"rb");
    if(!f) return 3;
    unsigned char head[12];
    if(fread(head,1,12,f)!=12){fclose(f);return 4;}
    if(memcmp(head,"JMB2",4)){fclose(f);return 5;}
    uint32_t plen=r32(head+4),expected=r32(head+8);
    if(plen<8||plen>MAXPAYLOAD){fclose(f);return 6;}
    unsigned char*p=(unsigned char*)malloc(plen);
    if(!p){fclose(f);return 7;}
    if(fread(p,1,plen,f)!=plen){free(p);fclose(f);return 8;}
    if(fgetc(f)!=EOF){free(p);fclose(f);return 9;}
    fclose(f);
    if(crc32_update(0,p,plen)!=expected){free(p);return 10;}
    size_t at=0;
    uint16_t ver=r16(p+at);at+=2;
    uint16_t bl=r16(p+at);at+=2;
    uint16_t kl=r16(p+at);at+=2;
    uint16_t n=r16(p+at);at+=2;
    if(ver!=2||bl>127||kl>63||n==0||n>MAXOPS||at+bl+kl+64+(size_t)n*5!=plen){free(p);return 11;}
    char body[128]={0},kind[64]={0};
    memcpy(body,p+at,bl);at+=bl;
    memcpy(kind,p+at,kl);at+=kl;
    at+=64;
    int32_t acc=0,mem[16]={0};
    int routes=0,gates=0,traces=0,moves=0,emits=0,checkpoints=0,ding=0,hold_state=0;
    for(uint16_t i=0;i<n;i++){
        uint8_t op=p[at++];
        int32_t a=(int32_t)r32(p+at);at+=4;
        switch(op){
            case 1:acc=a;break;
            case 2:acc+=a;break;
            case 3:acc-=a;break;
            case 4:acc*=a;break;
            case 5:if(a==0){free(p);return 20;}acc/=a;break;
            case 6:routes+=a;break;
            case 7:gates+=(a?1:0);break;
            case 8:traces++;break;
            case 9:moves+=a;break;
            case 10:if(a<0||a>=16){free(p);return 21;}mem[a]=acc;break;
            case 11:if(a<0||a>=16){free(p);return 22;}acc=mem[a];break;
            case 12:emits++;break;
            case 13:
                if(acc!=a){
                    printf("{\"body\":\"%s\",\"kind\":\"%s\",\"state\":\"BUGG\",\"assert_expected\":%d,\"acc\":%d}\n",body,kind,a,acc);
                    free(p);
                    return 23;
                }
                break;
            case 14:checkpoints++;break;
            case 15:hold_state=1;break;
            case 16:ding=1;break;
            default:free(p);return 24;
        }
    }
    printf("{\"body\":\"%s\",\"kind\":\"%s\",\"state\":\"%s\",\"acc\":%d,\"routes\":%d,\"gates\":%d,\"traces\":%d,\"moves\":%d,\"emits\":%d,\"checkpoints\":%d}\n",
           body,kind,ding?"DING":(hold_state?"HOLD":"HOLD"),acc,routes,gates,traces,moves,emits,checkpoints);
    free(p);
    return ding?0:25;
}