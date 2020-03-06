import requests
import json
import hashlib
import framework.examples.pyaes as pyaes
import socket
import sys

class Connection:
    def __init__(self, server, port):
        self.server = server
        self.port = int(port)
        self.token = ""
        self.serial = ""
        self.key = ""
        print("Setting connection target " + self.server + ":" + str(self.port))

    def check(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex((self.server, self.port))
        if result == 0:
            return True
        else:
            return False

    def do_login(self, username, password):
        url = "http://" + self.server + ":" + str(self.port) + "/api/login"
        hashed_username = hashlib.sha1(username.encode('utf-8')).hexdigest()
        hashed_password = hashlib.sha1((password + hashed_username[0:4]).encode('utf-8')).hexdigest()
        data = { "username": hashed_username }
        res = requests.post(url, data=json.dumps(data))
        if res.status_code != 200:
            print("Error: cannot login")
            return False
        else:
            resp = json.loads(res._content.decode('utf-8'))
            if resp["result"]["result"] != "E_OK":
                print(resp["result"]["text"])
                return False
            else:
                self.token = resp["token"]
                plaintext = pyaes.decrypt_message(hashed_password, resp["serialKey"])
                self.serial = json.loads(plaintext)["serial"]
                self.key = json.loads(plaintext)["key"]
                print("login succeeded")
                return True

    def do_logout(self):
        self.serial = self.serial + 1
        encrypted_data = pyaes.encrypt_message(self.key, json.dumps( { "serial": self.serial,
                                                                       "token": self.token } ) )
        url = "http://" + self.server + ":" + str(self.port) + "/api/logout"
        data = { "token": self.token, "data":  encrypted_data }
        res = requests.post(url, data=json.dumps(data))
        if res.status_code != 200:
            print("Error: cannot post message")
            return False
        else:
            if json.loads(res._content.decode('utf-8'))["result"]["result"] == "E_OK":
                return True
            else:
                return False

    def get_window(self, number):
        self.serial = self.serial + 1
        encrypted_data = pyaes.encrypt_message(self.key, json.dumps( { "serial": self.serial,
                                                                       "token": self.token } ) )
        url = "http://" + self.server + ":" + str(self.port) + "/api/window/" + str(number)
        data = { "token": self.token, "data":  encrypted_data }
        res = requests.post(url, data=json.dumps(data))
        if res.status_code != 200:
            print("Error: cannot post message")
            return False
        else:
            return json.loads(res._content.decode('utf-8'))

    def send_message(self, operation, url):
        self.serial = self.serial + 1
        encrypted_data = pyaes.encrypt_message(self.key, json.dumps( { "serial": self.serial,
                                                                       "token": self.token,
                                                                       "operation": operation } ) )
        url = "http://" + self.server + ":" + str(self.port) + url
        data = { "token": self.token, "data":  encrypted_data }
        res = requests.post(url, data=json.dumps(data))
        if res.status_code != 200:
            print("Error: cannot post message")
            return False
        else:
            if json.loads(res._content)["result"]["result"] == "E_OK":
                return pyaes.decrypt_message(self.key, json.loads(res._content)["data"])
            else:
                return json.loads(res._content)["result"]

    def send_data(self, data, url):
        self.serial = self.serial + 1
        encrypted_data = pyaes.encrypt_message(self.key, json.dumps( { "serial": self.serial,
			                                               "token": self.token,
			                                               "data": data } ) )
        url = "http://" + self.server + ":" + str(self.port) + url
        data = { "token": self.token, "data":  encrypted_data }
        res = requests.post(url, data=json.dumps(data))
        if res.status_code != 200:
            print("Error: cannot post message")
            return False
        else:
            return json.loads(res._content)["result"]["result"]

    def send_pushme(self):
        return self.send_message("post", "/api/application/pushme")

    def get_config(self, url):
        return self.send_message("get", url)



# predefined data structures

userdata1 = {'items':[{'frameType':'editListFrame','frameId':0,'frame':[[[{'itemType':'textnode','key':'username','text':'test'}],[{'itemType':'input','key':'realname','length':15,'value':'','password':False,'disabled':False}],[{'itemType':'input','key':'email','length':20,'value':'','password':False,'disabled':False}],[{'itemType':'input','key':'phone','length':10,'value':'','password':False,'disabled':False}],[{'itemType':'selection','key':'language','selected':'english','active':True,'hidden':False,'zeroOption':False,'onSelectFunction':'return;'}],[{'itemType':'checkbox','key':'view','checked':False,'title':'v','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'score-edit','checked':False,'title':'se','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'team-view','checked':False,'title':'tv','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'team-edit','checked':False,'title':'te','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'team-delete','checked':False,'title':'td','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'player-view','checked':False,'title':'pv','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'player-edit','checked':False,'title':'pe','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'player-delete','checked':False,'title':'pd','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'tournament-edit','checked':False,'title':'to','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'system-admin','checked':True,'title':'a','active':True,'onClickFunction':'return;'}],[{'itemType':'button','text':'Change','itemId':'2024','data':'test','callbackUrl':'/api/changepassword/','active':True},{'itemType':'input','key':'password','length':10,'value':'','password':True,'disabled':False}]],[[{'itemType':'input','key':'username','length':10,'value':'user1','password':False,'disabled':False}],[{'itemType':'input','key':'realname','length':15,'value':'user1','password':False,'disabled':False}],[{'itemType':'input','key':'email','length':20,'value':'nobody@here','password':False,'disabled':False}],[{'itemType':'input','key':'phone','length':10,'value':'-','password':False,'disabled':False}],[{'itemType':'selection','key':'language','selected':'english','active':True,'hidden':False,'zeroOption':False,'onSelectFunction':'return;'}],[{'itemType':'checkbox','key':'view','checked':False,'title':'v','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'score-edit','checked':False,'title':'se','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'team-view','checked':False,'title':'tv','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'team-edit','checked':False,'title':'te','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'team-delete','checked':False,'title':'td','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'player-view','checked':False,'title':'pv','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'player-edit','checked':False,'title':'pe','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'player-delete','checked':False,'title':'pd','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'tournament-edit','checked':False,'title':'to','active':True,'onClickFunction':'return;'},{'itemType':'checkbox','key':'system-admin','checked':False,'title':'a','active':True,'onClickFunction':'return;'}],[{'itemType':'textnode','key':'password','text':''}]]]},{'frameType':'fixedListFrame','frameId':1,'frame':[[[{'itemType':'textnode','key':'email_enabled','text':'Enabled'}],[{'itemType':'checkbox','key':'email_enabled','checked':False,'title':'enabled','active':True,'onClickFunction':'return;'}]],[[{'itemType':'textnode','key':'mailserver','text':'Mailserver'}],[{'itemType':'input','key':'mailserver','length':15,'value':'smtp.your-email.com','password':False,'disabled':False}]],[[{'itemType':'textnode','key':'username','text':'Username'}],[{'itemType':'input','key':'username','length':15,'value':'username','password':False,'disabled':False}]],[[{'itemType':'textnode','key':'sender','text':'Sender address'}],[{'itemType':'input','key':'sender','length':15,'value':'you <username@your-email.com>','password':False,'disabled':False}]],[[{'itemType':'textnode','key':'password','text':'Password'}],[{'itemType':'input','key':'password','length':15,'value':'','password':True,'disabled':False}]],[[{'itemType':'textnode','key':'use_ssl','text':'Use SSL'}],[{'itemType':'checkbox','key':'use_ssl','checked':True,'title':'use ssl','active':True,'onClickFunction':'return;'}]],[[{'itemType':'textnode','key':'blindly_trust','text':'Trust self-signed certs'}],[{'itemType':'checkbox','key':'blindly_trust','checked':True,'title':'blindly trust','active':True,'onClickFunction':'return;'}]]]}],'buttonList':[{'id':501,'text':'OK','callbackUrl':'/api/adminchange/'},{'id':502,'text':'Cancel','callbackFunction':''}]}

userdata2 = {"buttonId":"2041","buttonData":"user1","items":[{"frameType":"editListFrame","frameId":0,"frame":[[[{"itemType":"textnode","key":"username","text":"test"}],[{"itemType":"input","key":"realname","length":15,"value":"","password":False,"disabled":False}],[{"itemType":"input","key":"email","length":20,"value":"","password":False,"disabled":False}],[{"itemType":"input","key":"phone","length":10,"value":"","password":False,"disabled":False}],[{"itemType":"selection","key":"language","selected":"english","active":True,"hidden":False,"zeroOption":False,"onSelectFunction":"return;"}],[{"itemType":"checkbox","key":"view","checked":False,"title":"v","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"score-edit","checked":False,"title":"se","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"team-view","checked":False,"title":"tv","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"team-edit","checked":False,"title":"te","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"team-delete","checked":False,"title":"td","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"player-view","checked":False,"title":"pv","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"player-edit","checked":False,"title":"pe","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"player-delete","checked":False,"title":"pd","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"tournament-edit","checked":False,"title":"to","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"system-admin","checked":True,"title":"a","active":True,"onClickFunction":"return;"}],[{"itemType":"button","text":"Change","itemId":"2024","data":"test","callbackUrl":"/api/changepassword/","active":True},{"itemType":"input","key":"password","length":10,"value":"","password":True,"disabled":False}]],[[{"itemType":"textnode","key":"username","text":"user1"}],[{"itemType":"input","key":"realname","length":15,"value":"user1","password":False,"disabled":False}],[{"itemType":"input","key":"email","length":20,"value":"nobody@here","password":False,"disabled":False}],[{"itemType":"input","key":"phone","length":10,"value":"-","password":False,"disabled":False}],[{"itemType":"selection","key":"language","selected":"english","active":True,"hidden":False,"zeroOption":False,"onSelectFunction":"return;"}],[{"itemType":"checkbox","key":"view","checked":False,"title":"v","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"score-edit","checked":False,"title":"se","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"team-view","checked":False,"title":"tv","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"team-edit","checked":False,"title":"te","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"team-delete","checked":False,"title":"td","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"player-view","checked":False,"title":"pv","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"player-edit","checked":False,"title":"pe","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"player-delete","checked":False,"title":"pd","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"tournament-edit","checked":False,"title":"to","active":True,"onClickFunction":"return;"},{"itemType":"checkbox","key":"system-admin","checked":False,"title":"a","active":True,"onClickFunction":"return;"}],[{"itemType":"button","text":"Change","itemId":"2041","data":"user1","callbackUrl":"/api/changepassword/","active":True},{"itemType":"input","key":"password","length":10,"value":"user1","password":True,"disabled":False}]]]},{"frameType":"fixedListFrame","frameId":1,"frame":[[[{"itemType":"textnode","key":"email_enabled","text":"Enabled"}],[{"itemType":"checkbox","key":"email_enabled","checked":False,"title":"enabled","active":True,"onClickFunction":"return;"}]],[[{"itemType":"textnode","key":"mailserver","text":"Mailserver"}],[{"itemType":"input","key":"mailserver","length":15,"value":"smtp.your-email.com","password":False,"disabled":False}]],[[{"itemType":"textnode","key":"username","text":"Username"}],[{"itemType":"input","key":"username","length":15,"value":"username","password":False,"disabled":False}]],[[{"itemType":"textnode","key":"sender","text":"Sender address"}],[{"itemType":"input","key":"sender","length":15,"value":"you <username@your-email.com>","password":False,"disabled":False}]],[[{"itemType":"textnode","key":"password","text":"Password"}],[{"itemType":"input","key":"password","length":15,"value":"","password":True,"disabled":False}]],[[{"itemType":"textnode","key":"use_ssl","text":"Use SSL"}],[{"itemType":"checkbox","key":"use_ssl","checked":True,"title":"use ssl","active":True,"onClickFunction":"return;"}]],[[{"itemType":"textnode","key":"blindly_trust","text":"Trust self-signed certs"}],[{"itemType":"checkbox","key":"blindly_trust","checked":True,"title":"blindly trust","active":True,"onClickFunction":"return;"}]]]}]}
    


#---------------

admin_connection = Connection('localhost', '8080')
if admin_connection.check() is False:
    sys.exit('Cannot connect to the server')

if admin_connection.do_login('test', 'test') is True:
    print("Creating user, " + admin_connection.send_data(userdata1, '/api/adminchange/'))
    print("Changing password, " + admin_connection.send_data(userdata2, '/api/changepassword/'))
    print("")
    user_connection = Connection('localhost', '8080')
    if user_connection.do_login('user1', 'user1') is True:
        print("user connection succeeds")
    else:
        print("user connection failed")
        admin_connection.do_logout()
        sys.exit('Cannot connect to the server')

    print(admin_connection.get_config('/api/config/session'))
    user_connection.do_logout()
        
    #print(admin_connection.get_config('/api/config/tournaments'))
    #window = connection.get_window(0)
    # print(window['result'])
    #connection.send_pushme()
    #print(admin_connection.get_config('/api/config/users'))
    print(admin_connection.get_config('/api/config/session'))
    #print(admin_connection.get_config('/api/config/pending'))
    admin_connection.do_logout()
