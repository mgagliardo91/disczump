# DB host (secondary preferred as to avoid impacting primary performance)
HOST=localhost

# DB name
DBNAME=discdb

# S3 bucket name
BUCKET=zumpbucket

FOLDER=db_backups

# Linux user account
USER=ec2-user

# Current time
TIME=`/bin/date +%d-%m-%Y-%T`

# Backup directory
DEST=/home/$USER/tmp

# Tar file of backup directory
TAR=$DEST/../dz_backup.tar

# Create backup dir (-p to avoid warning if already exists)
/bin/mkdir -p $DEST

# Log
echo "Backing up $HOST/$DBNAME to s3://$BUCKET/ on $TIME";

# Dump from mongodb host into backup directory
/usr/bin/mongodump -h $HOST -d $DBNAME -o $DEST

# Create tar of backup directory
/bin/tar cvf $TAR -C $DEST .

# Upload tar to s3
 /usr/bin/aws s3 cp $TAR s3://$BUCKET/$FOLDER/

# Remove tar file locally
 /bin/rm -f $TAR

# Remove backup directory
 /bin/rm -rf $DEST

# All done
echo "Backup available at https://s3.amazonaws.com/$BUCKET/$TIME.tar"
